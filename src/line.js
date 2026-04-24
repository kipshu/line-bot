import crypto from "crypto";
import fetch from "node-fetch";

export function verifyLineSignature(req) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret) {
    console.warn("Missing LINE_CHANNEL_SECRET");
    return false;
  }

  const signature = req.headers["x-line-signature"];

  if (!signature || !req.rawBody) {
    return false;
  }

  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(req.rawBody)
    .digest("base64");

  return hash === signature;
}

export async function replyToLine(replyToken, text) {
  const accessToken = process.env.LINE_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn("Missing LINE_ACCESS_TOKEN");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("LINE reply failed:", await response.text());
  }
}

export async function pushToLine(to, text) {
  const accessToken = process.env.LINE_ACCESS_TOKEN;

  if (!accessToken || !to) {
    console.warn("Missing LINE_ACCESS_TOKEN or push target");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("LINE push failed:", await response.text());
  }
}
