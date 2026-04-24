import { KEYWORDS, PHONE_NUMBER, RESERVE_URL, SPECIAL_CLOSED } from "./config.js";
import { getUserState, setUserState } from "./state.js";
import { mainMenu, noPainMenu, painReply } from "./replies.js";
import { isBusinessOpenNow, getTokyoNowParts } from "./time.js";
import { isJapaneseHoliday } from "./holidays.js";

function norm(t){ return (t||"").trim(); }
function has(t, arr){ return arr.some(w=>t.includes(w)); }

function isHolidayQ(t){
  return ["休み","休診","営業","やってる","開いてる","祝日"].some(w=>t.includes(w));
}

async function businessReply(){
  const now = getTokyoNowParts();

  if (SPECIAL_CLOSED.some(r=>now.dateStr>=r.start && now.dateStr<=r.end)) {
    return `現在は特別休診期間です。

${RESERVE_URL}

${PHONE_NUMBER}`;
  }

  if (await isJapaneseHoliday(now.dateStr)) {
    return `本日は祝日のため休診です。

${RESERVE_URL}

${PHONE_NUMBER}`;
  }

  if (await isBusinessOpenNow()) {
    return `現在は診療時間内です。

お電話がスムーズです
${PHONE_NUMBER}

${RESERVE_URL}`;
  }

  return `現在は診療時間外です。

${RESERVE_URL}

${PHONE_NUMBER}`;
}

export async function getRuleBasedReply(msg, userId){
  const text = norm(msg);
  const state = getUserState(userId);

  // ★最優先：営業確認
  if (isHolidayQ(text)) {
    return await businessReply();
  }

  if (text === "メニュー"){
    setUserState(userId,{});
    return mainMenu();
  }

  if (text==="①"||text==="1"||text.includes("痛")){
    const c = (state.painCount||0)+1;
    setUserState(userId,{painCount:c});
    return painReply(c>=2);
  }

  if (text==="②"||text==="2"){
    return noPainMenu();
  }

  if (has(text, KEYWORDS.urgent)){
    return painReply();
  }

  return null;
}
