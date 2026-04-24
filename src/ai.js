import OpenAI from "openai";
import { CLINIC_NAME, RESERVE_URL, PHONE_NUMBER } from "./config.js";
import { isBusinessOpenNow } from "./time.js";
import { fallbackReply } from "./replies.js";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

export async function askAI(userMessage) {
  if (!openai) {
    return fallbackReply();
  }

  const safeUserMessage = String(userMessage || "").slice(0, 500);
  const openNow = isBusinessOpenNow() ? "診療時間内" : "診療時間外";

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
- 必ず短く丁寧に
- 4〜6行以内
- 緊急性あり→電話
- それ以外→予約URL
- 最後は必ず行動で終える

医院情報:
- 医院名: ${CLINIC_NAME}
- 現在: ${openNow}
- 電話番号: ${PHONE_NUMBER}
- 予約URL: ${RESERVE_URL}
        `.trim(),
      },
      {
        role: "user",
        content: safeUserMessage,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) return fallbackReply();

  return formatForLine(text);
}
