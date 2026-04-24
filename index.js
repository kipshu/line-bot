import express from "express";
import { cleanupOldStates, setUserState } from "./src/state.js";
import { getRuleBasedReply } from "./src/rules.js";
import { askAI } from "./src/ai.js";
import { fallbackReply } from "./src/replies.js";
import { verifyLineSignature, replyToLine, pushToLine } from "./src/line.js";

console.log("NEW CODE DEPLOYED 2026-04-24");

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// 30分ごとに古い状態を掃除
setInterval(cleanupOldStates, 1000 * 60 * 30);

function getUrgentTriage(userMessage) {
  const text = (userMessage || "").toLowerCase();

  const urgentPatterns = [
    {
      category: "bleeding",
      label: "抜歯後出血・止血困難の可能性",
      keywords: [
        "血が止まらない",
        "血がとまらない",
        "出血が止まらない",
        "出血がとまらない",
        "血がたまる",
        "血が溜まる",
        "圧迫しても止まらない",
        "ガーゼ噛んでも止まらない",
        "ガーゼかんでも止まらない",
      ],
      reply: `出血が続いている場合は、早めの対応が必要です。

すでに清潔なガーゼを強く噛んで、途中で外さず10〜15分しっかり圧迫しても止まらない場合は、
院内での止血処置が必要な可能性があります。

この時点で、すぐにお電話ください。
📞 03-5779-9225`,
    },
    {
      category: "severe_pain",
      label: "強い痛み・鎮痛剤無効の可能性",
      keywords: [
        "激痛",
        "我慢できない",
        "痛すぎる",
        "鎮痛剤効かない",
        "鎮痛剤が効かない",
        "薬が効かない",
        "痛み止め効かない",
        "痛み止めが効かない",
      ],
      reply: `強い痛みがある場合は、早めの確認が必要です。

鎮痛剤を飲んでも効かない、我慢できないほど痛い場合は、
処置が必要な可能性があります。

すぐにお電話ください。
📞 03-5779-9225`,
    },
    {
      category: "swelling_fever",
      label: "腫れ・発熱・感染疑い",
      keywords: [
        "顔が腫れた",
        "顔がはれた",
        "腫れてきた",
        "はれてきた",
        "腫れがひどい",
        "はれがひどい",
        "発熱",
        "熱がある",
        "膿",
        "うみ",
      ],
      reply: `腫れや発熱がある場合は、炎症や感染が進んでいる可能性があります。

特に、顔が腫れてきた・発熱がある・腫れが強い場合は、
早めの診察が必要です。

すぐにお電話ください。
📞 03-5779-9225`,
    },
    {
      category: "trauma",
      label: "外傷・歯の破折/脱落の可能性",
      keywords: [
        "歯が抜けた",
        "歯がぬけた",
        "歯が折れた",
        "歯がかけた",
        "歯が欠けた",
        "ぶつけた",
        "外傷",
        "転んだ",
        "口を切った",
      ],
      reply: `歯やお口をぶつけた場合は、早めの確認が必要です。

歯が抜けた・折れた・強くぶつけた場合は、
処置のタイミングが大切です。

すぐにお電話ください。
📞 03-5779-9225`,
    },
    {
      category: "numbness",
      label: "しびれ・感覚異常の可能性",
      keywords: [
        "しびれ",
        "痺れ",
        "麻痺",
        "まひ",
        "感覚がない",
        "感覚ない",
        "感覚が戻らない",
        "感覚がもどらない",
      ],
      reply: `しびれや感覚の異常がある場合は、早めの確認が必要です。

抜歯後や処置後にしびれ・麻痺感・感覚が戻らない場合は、
状態確認が必要です。

すぐにお電話ください。
📞 03-5779-9225`,
    },
  ];

  for (const pattern of urgentPatterns) {
    if (pattern.keywords.some((keyword) => text.includes(keyword))) {
      return pattern;
    }
  }

  return null;
}

function createStaffAlertMessage({ triage, userMessage, userId }) {
  return `【要確認】LINE緊急トリアージ

分類：
${triage.label}

患者メッセージ：
${userMessage}

患者への自動返信：
即電話案内済み

対応目安：
LINE上で追加対応せず、必要に応じて電話・来院対応を確認してください。

LINE userId：
${userId}`;
}

async function notifyStaffIfNeeded({ triage, userMessage, userId }) {
  const staffGroupId = process.env.STAFF_LINE_GROUP_ID;

  if (!staffGroupId) {
    console.warn("STAFF_LINE_GROUP_ID is not set");
    return;
  }

  const alertMessage = createStaffAlertMessage({
    triage,
    userMessage,
    userId,
  });

  await pushToLine(staffGroupId, alertMessage);
}

async function getReplyText(userMessage, userId) {
  const urgentTriage = getUrgentTriage(userMessage);

  if (urgentTriage) {
    setUserState(userId, {
      category: `urgent_${urgentTriage.category}`,
      painCount: 0,
      lastReply: "urgent_triage",
      forceHuman: true,
    });

    await notifyStaffIfNeeded({
      triage: urgentTriage,
      userMessage,
      userId,
    });

    return urgentTriage.reply;
  }

  const ruleReply = await getRuleBasedReply(userMessage, userId);
  if (ruleReply) return ruleReply;

  try {
    const aiReply = await askAI(userMessage);

    setUserState(userId, {
      category: "ai",
      painCount: 0,
      lastReply: "ai",
    });

    return aiReply;
  } catch (_error) {
    console.error("OpenAI error occurred");
    return fallbackReply();
  }
}

app.post("/webhook", async (req, res) => {
  if (!verifyLineSignature(req)) {
    console.warn("Invalid LINE signature");
    return res.sendStatus(401);
  }

  // LINE側の再送防止のため、先に200を返す
  res.sendStatus(200);

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== "message") continue;
    if (event.message?.type !== "text") continue;
    if (!event.replyToken) continue;

    const userMessage = event.message.text;
    const userId = event.source?.userId || "unknown";

    // groupId取得用の一時ログ
    console.log("LINE SOURCE:", event.source);

    try {
      const replyText = await getReplyText(userMessage, userId);
      await replyToLine(event.replyToken, replyText);
    } catch (_error) {
      console.error("Event handling error occurred");
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
