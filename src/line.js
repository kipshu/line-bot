import crypto from "crypto";

const ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

export function verifyLineSignature(req) {
  if (!LINE_CHANNEL_SECRET) return false;

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

export async function replyToLine(replyToken, text) {
  if (!ACCESS_TOKEN) {
    throw new Error("LINE_ACCESS_TOKEN not set");
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: text.slice(0, 1000) }],
    }),
  });

  if (!response.ok) {
    throw new Error("LINE reply failed");
  }
}
