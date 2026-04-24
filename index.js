import express from "express";
import { cleanupOldStates, setUserState } from "./src/state.js";
import { getRuleBasedReply } from "./src/rules.js";
import { askAI } from "./src/ai.js";
import { fallbackReply } from "./src/replies.js";
import { verifyLineSignature, replyToLine } from "./src/line.js";

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

// ===== 最優先：抜歯後出血系の安全分岐 =====
function getBleedingEmergencyReply(userMessage) {
  const text = (userMessage || "").toLowerCase();

  const hasBleedingWord =
    text.includes("血") ||
    text.includes("出血") ||
    text.includes("血が止まらない") ||
    text.includes("止まらない") ||
    text.includes("血がとまらない") ||
    text.includes("とまらない");

  if (!hasBleedingWord) return null;

  const alreadyTried =
    text.includes("やった") ||
    text.includes("やってる") ||
    text.includes("やりました") ||
    text.includes("試した") ||
    text.includes("ためした") ||
    text.includes("ガーゼ") ||
    text.includes("噛んで") ||
    text.includes("かんで") ||
    text.includes("圧迫") ||
    text.includes("押さえた") ||
    text.includes("おさえた");

  const notStopped =
    text.includes("止まらない") ||
    text.includes("とまらない") ||
    text.includes("止まってない") ||
    text.includes("まだ出る") ||
    text.includes("まだでる") ||
    text.includes("出続ける") ||
    text.includes("でつづける");

  // すでに圧迫したのに止まらない人
  if (alreadyTried && notStopped) {
    return `抜歯後の出血が続いている場合は、早めの対応が必要です。

すでに「清潔なガーゼを強く噛んで、途中で外さず10〜15分しっかり圧迫」を行っても止まらない場合は、
院内での止血処置が必要な可能性があります。

この時点で、すぐにお電話ください。
📞 03-5779-9225

口の中に血がたまり続ける、何度も吐き出すほど出血する場合も、すぐにお電話ください。`;
  }

  // 初回案内
  return `抜歯後の出血が続いている場合は、早めの対応が必要です。

まずは清潔なガーゼやティッシュをしっかり噛んで、
10〜15分ほど強めに圧迫してください。
※途中で外さず、そのまま続けるのが大切です

それでも止まらない場合は、
新しいガーゼに替えて再度しっかり圧迫してください。

すでに十分に圧迫しても止まらない場合や、
口の中に血がたまり続ける場合は、すぐにお電話ください。
📞 03-5779-9225`;
}

async function getReplyText(userMessage, userId) {
  // ===== ここを最優先にする =====
  const bleedingReply = getBleedingEmergencyReply(userMessage);
  if (bleedingReply) {
    setUserState(userId, {
      category: "emergency_bleeding",
      painCount: 0,
      lastReply: "bleeding_emergency",
    });

    return bleedingReply;
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
