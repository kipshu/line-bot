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
  } catch (_error) {
    // 患者入力やAPI詳細をログに出さない
    console.error("OpenAI error occurred");
    return fallbackReply();
  }
}

app.post("/webhook", async (req, res) => {
  if (!verifyLineSignature(req)) {
    console.warn("Invalid LINE signature");
    return res.sendStatus(401);
  }

  // LINEには先に200を返す
  // 500を返すとLINE側でリトライされ、二重送信になる可能性がある
  res.sendStatus(200);

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type !== "message") continue;
    if (event.message?.type !== "text") continue;
    if (!event.replyToken) continue;

    const userMessage = event.message.text;
    const userId = event.source?.userId || "unknown-user";

    try {
      const replyText = await getReplyText(userMessage, userId);
      await replyToLine(event.replyToken, replyText);
    } catch (_error) {
      // userId・患者入力・詳細エラーはログに出さない
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
