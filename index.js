import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";
import crypto from "crypto";

console.log("NEW CODE DEPLOYED 2026-04-23");

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

const ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ===== ここを自分の医院用に変更 =====
const CLINIC_NAME = "大畑歯科口腔外科 世田谷分院";
const RESERVE_URL = "https://www.ohata-dental.jp/setagaya/index.html";
const PHONE_NUMBER = "03-5779-9225";
// ====================================

const openai = OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

// 営業時間設定（JST基準）
// 0:日 1:月 2:火 3:水 4:木 5:金 6:土
const BUSINESS_HOURS = {
  0: { start: "09:00", end: "16:00" },
  1: { start: "10:00", end: "19:00" },
  2: { start: "10:00", end: "19:00" },
  3: { start: "10:00", end: "19:00" },
  4: { start: "10:00", end: "19:00" },
  5: { start: "10:00", end: "19:00" },
  6: { start: "10:00", end: "19:00" },
};

const KEYWORDS = {
  urgent: ["痛い", "かなり痛い", "ズキズキ", "腫れ", "出血", "急ぎ", "今日", "寝られない"],
  mildPain: ["しみる", "冷たい", "熱い", "違和感", "少し痛い", "噛むと痛い"],
  filling: ["詰め物", "詰め", "銀歯", "被せ物", "被せ", "取れた", "外れた", "ぐらぐら"],
  broken: ["欠けた", "割れた", "ヒビ", "折れた"],
  wisdom: ["親知らず", "親不知", "抜歯"],
  gum: ["歯ぐき", "歯茎", "歯周病", "口臭", "膿"], // ★修正：urgentと重複していた「膿」はurgentから削除してここに統一
  cleaning: ["クリーニング", "歯石", "歯石取り", "メンテ", "定期検診", "検診", "掃除"],
  esthetic: ["ホワイトニング", "白くしたい", "見た目", "セラミック", "審美", "銀歯を白く"],
  denture: ["入れ歯", "義歯", "合わない", "外れる", "噛めない"],
  child: ["子ども", "こども", "子供", "乳歯", "フッ素", "学校検診"],
};

const userStateMap = new Map();

function getUserState(userId) {
  return (
    userStateMap.get(userId) || {
      category: null,
      painCount: 0,
      lastReply: "",
      updatedAt: Date.now(),
    }
  );
}

function setUserState(userId, nextState) {
  userStateMap.set(userId, {
    ...nextState,
    updatedAt: Date.now(),
  });
}

function cleanupOldStates() {
  const now = Date.now();
  const ttl = 1000 * 60 * 60 * 12; // 12時間
  for (const [userId, state] of userStateMap.entries()) {
    if (!state.updatedAt || now - state.updatedAt > ttl) {
      userStateMap.delete(userId);
    }
  }
}

// ★修正：cleanupはsetIntervalで定期実行。毎リクエストで走らせない
setInterval(cleanupOldStates, 1000 * 60 * 30); // 30分ごと

function verifyLineSignature(req) {
  // ★修正：シークレット未設定時は素通りさせず拒否する
  if (!LINE_CHANNEL_SECRET) {
    console.error("LINE_CHANNEL_SECRET is not set. Rejecting request.");
    return false;
  }

  const signature = req.headers["x-line-signature"];
  if (!signature || !req.rawBody) return false;

  const digest = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(req.rawBody)
    .digest("base64");

  const a = Buffer.from(signature);
  const b = Buffer.from(digest);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function getTokyoNowParts() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());

  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const weekdayMap = {
    日: 0,
    月: 1,
    火: 2,
    水: 3,
    木: 4,
    金: 5,
    土: 6,
  };

  return {
    day: weekdayMap[map.weekday],
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function isBusinessOpenNow() {
  const now = getTokyoNowParts();
  const schedule = BUSINESS_HOURS[now.day];
  if (!schedule) return false;

  const currentMinutes = now.hour * 60 + now.minute;
  return (
    currentMinutes >= toMinutes(schedule.start) &&
    currentMinutes <= toMinutes(schedule.end)
  );
}

function normalizeText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function formatForLine(text) {
  return (text || "")
    .replace(/。/g, "。\n")
    .replace(/！/g, "！\n")
    .replace(/!/g, "!\n")
    .replace(/？/g, "？\n")
    .replace(/\?/g, "?\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1000);
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function fallbackReply() {
  // ★修正：「最初に戻る」案内を削除。fallbackは電話・予約だけに絞る
  return `ありがとうございます。

詳しい内容をこのまま送っていただくか、
お電話 ${PHONE_NUMBER} にてご相談ください。

ご予約はこちら
${RESERVE_URL}`;
}

function mainMenu() {
  return `${CLINIC_NAME}です。

今、痛みや腫れはありますか？

① はい（痛み・腫れがある）
② いいえ（痛み・腫れはない）
③ わからない・相談したい

※ 最初に戻るときは「メニュー」と送ってください。`;
}

function noPainMenu() {
  return `ご希望に近いものを選んでください。

① 詰め物・被せ物
② 親知らず
③ 見た目・セラミック
④ クリーニング
⑤ その他

※ 最初に戻るときは「メニュー」と送ってください。`;
}

function painReply(isFollowUp = false) {
  if (isBusinessOpenNow()) {
    if (isFollowUp) {
      return `症状が強そうです。

本日対応できる可能性があります。
お電話でのご案内が最短です。

${PHONE_NUMBER}`;
    }

    return `痛み・腫れがある場合は、早めの確認をおすすめします。

本日対応できる可能性があります。
まずはお電話ください。

${PHONE_NUMBER}

このまま
・どこが痛むか
・腫れがあるか
・いつからか
を送っていただければ、受付確認用の内容としてお預かりできます。

予約をご希望の方はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (isFollowUp) {
    return `症状が強そうです。

お急ぎの場合は、
まずはお電話でご確認ください。

${PHONE_NUMBER}

予約はこちら
${RESERVE_URL}`;
  }

  return `痛み・腫れがある場合は、早めの確認をおすすめします。
現在は診療時間外です。

お急ぎの場合は、まずはお電話でご確認ください。
${PHONE_NUMBER}

予約をご希望の方はこちら
${RESERVE_URL}

強い痛み・強い腫れ・出血がある場合は、無理をせず早めの相談をご検討ください。

最初に戻る場合は「メニュー」と送ってください。`;
}

function categoryReply(text) {
  if (
    text === "1" ||
    text === "①" ||
    text === "① 詰め物・被せ物" ||
    text.includes("詰め") ||
    text.includes("被せ")
  ) {
    return `詰め物・被せ物のご相談ですね。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (
    text === "2" ||
    text === "②" ||
    text === "② 親知らず" ||
    text.includes("親知らず")
  ) {
    return `親知らずのご相談ですね。

当院では口腔外科系のご相談にも対応しています。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (
    text === "3" ||
    text === "③" ||
    text === "③ 見た目・セラミック" ||
    text.includes("見た目") ||
    text.includes("セラミック") ||
    text.includes("審美")
  ) {
    return `見た目・セラミックのご相談ですね。

カウンセリング予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (
    text === "4" ||
    text === "④" ||
    text === "④ クリーニング" ||
    text.includes("クリーニング") ||
    text.includes("メンテ")
  ) {
    return `クリーニング・メンテナンスのご相談ですね。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (
    text === "5" ||
    text === "⑤" ||
    text === "⑤ その他" ||
    text.includes("その他")
  ) {
    return `ありがとうございます。

詳しい内容をこのままメッセージで送っていただくか、
お電話でご相談ください。

お電話
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  return null;
}

function consultReply(text) {
  if (
    text.includes("痛") ||
    text.includes("腫れ") ||
    text.includes("出血") ||
    text.includes("しみる") ||
    text.includes("噛むと痛い") ||
    text.includes("ズキズキ")
  ) {
    return painReply();
  }

  if (
    text.includes("親知らず") ||
    text.includes("セラミック") ||
    text.includes("見た目") ||
    text.includes("詰め物") ||
    text.includes("被せ物") ||
    text.includes("クリーニング")
  ) {
    return `ありがとうございます。

内容に応じたご案内をいたします。

まず、痛みや腫れはありますか？

① はい
② いいえ

最初に戻る場合は「メニュー」と送ってください。`;
  }

  return null;
}

function detailedRuleReply(text) {
  if (includesAny(text, KEYWORDS.urgent)) {
    return painReply();
  }

  if (includesAny(text, KEYWORDS.mildPain)) {
    return `しみる・違和感がある場合は、早めの確認をおすすめします。

症状が強い場合はお電話でのご案内が最短です。
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.filling)) {
    return `詰め物・被せ物が外れた可能性があります。

早めの受診をおすすめします。

ご予約はこちら
${RESERVE_URL}

お急ぎの場合はお電話ください
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.broken)) {
    return `歯が欠けた・割れた可能性があります。

早めの確認をおすすめします。

お急ぎの場合はお電話ください
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.wisdom)) {
    return `親知らずのご相談ですね。

当院では口腔外科系のご相談にも対応しています。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.gum)) {
    return `歯ぐきの症状がある場合は、早めの確認をおすすめします。

症状が強い場合はお電話ください
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.cleaning)) {
    return `クリーニング・検診のご相談ですね。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.esthetic)) {
    return `見た目・セラミックのご相談ですね。

カウンセリング予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.denture)) {
    return `入れ歯のご相談ですね。

痛みや違和感がある場合は、早めの受診をおすすめします。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.child)) {
    return `お子さまの歯のご相談ですね。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  return null;
}

function getRuleBasedReply(userMessage, userId) {
  const text = normalizeText(userMessage);
  const lower = text.toLowerCase();
  const state = getUserState(userId);

  if (
    lower === "menu" ||
    text === "メニュー" ||
    text === "最初" ||
    text === "戻る"
  ) {
    setUserState(userId, {
      category: null,
      painCount: 0,
      lastReply: "menu",
    });
    return mainMenu();
  }

  const isPainLike =
    text === "① はい（痛み・腫れがある）" ||
    text === "①" ||
    text === "1" ||
    text === "はい" ||
    text.includes("痛みあり") ||
    text.includes("腫れあり") ||
    text.includes("痛") ||
    text.includes("腫れ") ||
    text.includes("出血") ||
    text.includes("しみる") ||
    text.includes("ズキズキ") ||
    text.includes("噛むと痛い");

  if (isPainLike) {
    const nextPainCount = (state.painCount || 0) + 1;
    setUserState(userId, {
      category: "pain",
      painCount: nextPainCount,
      lastReply: "pain",
    });
    return painReply(nextPainCount >= 2);
  }

  if (
    text === "② いいえ（痛み・腫れはない）" ||
    text === "②" ||
    text === "2" ||
    text === "いいえ" ||
    text.includes("痛みない") ||
    text.includes("痛みなし")
  ) {
    setUserState(userId, {
      category: "no_pain",
      painCount: 0,
      lastReply: "no_pain",
    });
    return noPainMenu();
  }

  if (
    text === "③ わからない・相談したい" ||
    text === "③" ||
    text === "3" ||
    text.includes("相談") ||
    text.includes("わからない")
  ) {
    setUserState(userId, {
      category: "consult",
      painCount: 0,
      lastReply: "consult",
    });
    return `ご相談ありがとうございます。

今のお困りごとに近いものを送ってください。

例）
・奥歯がしみる
・親知らずが気になる
・銀歯を白くしたい
・クリーニングしたい

お急ぎの場合はお電話ください
${PHONE_NUMBER}`;
  }

  const category = categoryReply(text);
  if (category) {
    setUserState(userId, {
      category: "category",
      painCount: 0,
      lastReply: "category",
    });
    return category;
  }

  const detailed = detailedRuleReply(text);
  if (detailed) {
    const painLikeDetailed =
      includesAny(text, KEYWORDS.urgent) || includesAny(text, KEYWORDS.mildPain);

    if (painLikeDetailed) {
      const nextPainCount = (state.painCount || 0) + 1;
      setUserState(userId, {
        category: "pain",
        painCount: nextPainCount,
        lastReply: "pain",
      });
      return painReply(nextPainCount >= 2);
    }

    setUserState(userId, {
      category: "detailed",
      painCount: 0,
      lastReply: "detailed",
    });
    return detailed;
  }

  const consult = consultReply(text);
  if (consult) {
    setUserState(userId, {
      category: "consult",
      painCount: 0,
      lastReply: "consult",
    });
    return consult;
  }

  return null;
}

async function askAI(userMessage) {
  if (!openai) {
    return fallbackReply();
  }

  const openNow = isBusinessOpenNow() ? "診療時間内" : "診療時間外";

  // ★修正：openai.responses.create → openai.chat.completions.create に変更
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `
あなたは歯科医院のLINE受付補助です。
役割は「診断」ではなく「行動案内」です。

絶対ルール:
- 診断しない
- 薬の指示をしない
- 治療方針を断定しない
- 必ず丁寧で短く答える
- 必ず改行を入れて読みやすくする
- 1行は短く
- 全体で4〜6行以内
- 緊急性がある内容は電話案内を優先
- 緊急性が低い内容は予約URLを案内
- 判断が難しい場合は、追加で1つだけ短く確認してよい
- 最後は必ず次の行動で終える

導線ルール:
- 痛み、腫れ、出血、強い違和感、急ぎ、取れた、外れた、欠けた、割れた → 電話優先
- 見た目、セラミック、クリーニング、親知らず相談、ホワイトニング → 予約URL案内
- 予約か電話か迷う場合は、まず電話案内を優先

医院情報:
- 医院名: ${CLINIC_NAME}
- 現在: ${openNow}
- 電話番号: ${PHONE_NUMBER}
- 予約URL: ${RESERVE_URL}

出力ルール:
- ユーザーにそのまま送る本文のみ出力
- URLと電話番号はそのまま表示
- 改行を自然に使う
        `.trim(),
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  // ★修正：response.output_text → response.choices[0].message.content に変更
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    return fallbackReply();
  }

  return formatForLine(text);
}

async function getReplyText(userMessage, userId) {
  const ruleReply = getRuleBasedReply(userMessage, userId);
  if (ruleReply) return ruleReply;

  try {
    const aiReply = await askAI(userMessage);
    setUserState(userId, {
      category: "ai",
      painCount: 0,
      lastReply: "ai",
    });
    return aiReply;
  } catch (error) {
    console.error("OpenAI error:", error);
    return fallbackReply();
  }
}

async function replyToLine(replyToken, text) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: text.slice(0, 5000) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE reply failed: ${response.status} ${body}`);
  }
}

app.post("/webhook", async (req, res) => {
  // ★修正：署名検証失敗・処理エラー時もLINEには200を返す
  // 理由：500を返すとLINEがリトライして二重送信になるため

  if (!verifyLineSignature(req)) {
    console.warn("Invalid LINE signature");
    return res.sendStatus(401);
  }

  // ここから先は常に200で返す
  res.sendStatus(200);

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== "message" || event.message.type !== "text") {
      continue;
    }

    if (!event.replyToken) {
      continue;
    }

    const userMessage = event.message.text;
    const userId = event.source?.userId || "unknown-user";

    try {
      const replyText = await getReplyText(userMessage, userId);
      await replyToLine(event.replyToken, replyText);
    } catch (error) {
      // ★修正：個別イベントのエラーはログだけ。replyTokenは1回限りなのでリトライ不要
      console.error("Event handling error for userId:", userId, error);
    }
  }
});

app.get("/", (_req, res) => {
  res.send("LINE bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
