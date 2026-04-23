
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

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    return fallbackReply();
  }

  return formatForLine(text);
}
