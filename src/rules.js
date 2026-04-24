import { KEYWORDS, PHONE_NUMBER, RESERVE_URL, SPECIAL_CLOSED } from "./config.js";
import { getUserState, setUserState } from "./state.js";
import {
  mainMenu,
  noPainMenu,
  painReply,
  categoryReply,
  consultReply,
} from "./replies.js";
import { isBusinessOpenNow, getTokyoNowParts } from "./time.js";
import { isJapaneseHoliday } from "./holidays.js";

function norm(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function has(text, words = []) {
  return words.some((word) => text.includes(word));
}

function phoneLine(label = "お電話はこちら") {
  return `${label}
📞 ${PHONE_NUMBER}`;
}

function reserveLine(label = "ご予約はこちら（24時間受付）") {
  return `${label}
${RESERVE_URL}`;
}

function isHolidayQuestion(text) {
  return ["休み", "休診", "営業", "やってる", "開いてる", "今日", "祝日"].some((word) =>
    text.includes(word)
  );
}

async function businessReply() {
  const now = getTokyoNowParts();

  if (SPECIAL_CLOSED.some((r) => now.dateStr >= r.start && now.dateStr <= r.end)) {
    return `現在は特別休診期間です。

通常は月〜土 10:00〜19:00、日曜 9:00〜16:00 です。

${reserveLine()}

${phoneLine("お急ぎの場合はこちら")}`;
  }

  if (await isJapaneseHoliday(now.dateStr)) {
    return `本日は祝日のため休診です。

通常は月〜土 10:00〜19:00、日曜 9:00〜16:00 です。

${reserveLine()}

${phoneLine("お急ぎの場合はこちら")}`;
  }

  if (await isBusinessOpenNow()) {
    return `現在は診療時間内です。

お電話でのご案内がスムーズです。

${phoneLine()}

${reserveLine()}`;
  }

  return `現在は診療時間外です。

通常は月〜土 10:00〜19:00、日曜 9:00〜16:00 です。

${reserveLine()}

${phoneLine("お急ぎの場合はこちら")}`;
}

export async function getRuleBasedReply(msg, userId) {
  const text = norm(msg);
  const lower = text.toLowerCase();
  const state = getUserState(userId);

  if (isHolidayQuestion(text)) {
    return await businessReply();
  }

  if (lower === "menu" || text === "メニュー" || text === "最初" || text === "戻る") {
    setUserState(userId, { category: null, painCount: 0, lastReply: "menu" });
    return mainMenu();
  }

  if (state.lastReply === "no_pain" || state.category === "no_pain") {
    const category = categoryReply(text);
    if (category) {
      setUserState(userId, { category: "category", painCount: 0, lastReply: "category" });
      return category;
    }
  }

  const isExplicitPain =
    text === "① はい（痛み・腫れがある）" ||
    text.includes("痛みあり") ||
    text.includes("腫れあり") ||
    text.includes("痛") ||
    text.includes("腫れ") ||
    text.includes("出血") ||
    text.includes("しみる") ||
    text.includes("ズキズキ") ||
    text.includes("噛むと痛い") ||
    has(text, KEYWORDS.urgent) ||
    has(text, KEYWORDS.mildPain);

  const isMenuPainChoice =
    (text === "①" || text === "1" || text === "はい") &&
    (state.lastReply === "menu" || !state.lastReply);

  if (isExplicitPain || isMenuPainChoice) {
    const nextPainCount = (state.painCount || 0) + 1;
    setUserState(userId, { category: "pain", painCount: nextPainCount, lastReply: "pain" });
    return await painReply(nextPainCount >= 2);
  }

  const isNoPainChoice =
    text === "② いいえ（痛み・腫れはない）" ||
    text.includes("痛みない") ||
    text.includes("痛みなし") ||
    ((text === "②" || text === "2" || text === "いいえ") &&
      (state.lastReply === "menu" || !state.lastReply));

  if (isNoPainChoice) {
    setUserState(userId, { category: "no_pain", painCount: 0, lastReply: "no_pain" });
    return noPainMenu();
  }

  if (
    text === "③ わからない・相談したい" ||
    text.includes("相談") ||
    text.includes("わからない") ||
    ((text === "③" || text === "3") && (state.lastReply === "menu" || !state.lastReply))
  ) {
    setUserState(userId, { category: "consult", painCount: 0, lastReply: "consult" });

    return `ご相談ありがとうございます。

今のお困りごとに近いものを送ってください。

例）
・奥歯がしみる
・親知らずが気になる
・銀歯を白くしたい
・クリーニングしたい

${phoneLine("お急ぎの場合はこちら")}`;
  }

  if (has(text, KEYWORDS.ambiguous)) {
    setUserState(userId, { category: "consult", painCount: 0, lastReply: "consult" });

    return `詳しい状況を確認させてください。

・痛みはありますか？
・腫れはありますか？

① はい
② いいえ

${phoneLine("お急ぎの場合はこちら")}`;
  }

  const category = categoryReply(text);
  if (category) {
    setUserState(userId, { category: "category", painCount: 0, lastReply: "category" });
    return category;
  }

  const consult = await consultReply(text);
  if (consult) {
    setUserState(userId, { category: "consult", painCount: 0, lastReply: "consult" });
    return consult;
  }

  return null;
}
