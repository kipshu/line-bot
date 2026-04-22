import express from "express";
import fetch from "node-fetch"

console.log("NEW CODE DEPLOYED 2026-04-22");const app = express();
app.use(express.json());

const ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
// ===== ここを自分の医院用に変更 =====
const CLINIC_NAME = "大畑歯科口腔外科 世田谷分院";
const RESERVE_URL = "www.ohata-dental.jp/setagaya/index.html";
const PHONE_NUMBER = "03-5779-9225";

// 営業時間設定
// 0:日 1:月 2:火 3:水 4:木 5:金 6:土
const BUSINESS_HOURS = {
  0: { start: "09:00", end: "16:00" }, // 日
  1: { start: "10:00", end: "19:00" }, // 月
  2: { start: "10:00", end: "19:00" }, // 火
  3: { start: "10:00", end: "19:00" }, // 水
  4: { start: "10:00", end: "19:00" }, // 木
  5: { start: "10:00", end: "19:00" }, // 金
  6: { start: "10:00", end: "19:00" }, // 土
};
// ====================================

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isBusinessOpenNow() {
  const now = new Date();
  const day = now.getDay();
  const schedule = BUSINESS_HOURS[day];
  if (!schedule) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    currentMinutes >= toMinutes(schedule.start) &&
    currentMinutes <= toMinutes(schedule.end)
  );
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

function painReply() {
  if (isBusinessOpenNow()) {
    return `痛み・腫れがある場合は、早めの確認をおすすめします。

【まずはお電話ください】
${PHONE_NUMBER}

このまま
・どこが痛むか
・腫れがあるか
・いつからか
を送っていただければ、受付確認用の内容としてお預かりできます。

※ 予約をご希望の方はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  return `痛み・腫れがある場合は、早めの確認をおすすめします。
現在は診療時間外です。

【お急ぎの場合】
まずはお電話でご確認ください
${PHONE_NUMBER}

【予約をご希望の方】
${RESERVE_URL}

強い痛み・強い腫れ・出血がある場合は、無理をせず早めの相談をご検討ください。

最初に戻る場合は「メニュー」と送ってください。`;
}

function categoryReply(text) {
  if (
    text === "1" ||
    text === "①" ||
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
    text.includes("その他")
  ) {
    return `ありがとうございます。
詳しい内容は、このままメッセージで送っていただくか、お電話でご相談ください。

お電話
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  return noPainMenu();
}

function consultReply(text) {
  if (
    text.includes("痛") ||
    text.includes("腫れ") ||
    text.includes("出血") ||
    text.includes("しみる") ||
    text.includes("噛むと痛い")
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

  return `ありがとうございます。
簡単で大丈夫ですので、以下をこのまま送ってください。

・どんなことで困っているか
・痛みや腫れがあるか
・いつからか

お急ぎの場合はお電話ください
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
}

function getReplyText(userMessage) {
  const text = (userMessage || "").trim();
  const lower = text.toLowerCase();

  if (
    lower === "menu" ||
    text === "メニュー" ||
    text === "最初" ||
    text === "戻る"
  ) {
    return mainMenu();
  }

  // 痛みあり
  if (
    text === "① はい（痛み・腫れがある）" ||
    text === "①" ||
    text === "1" ||
    text === "はい" ||
    text.includes("痛みあり") ||
    text.includes("腫れあり")
  ) {
    return painReply();
  }

  // 痛みなし
  if (
    text === "② いいえ（痛み・腫れはない）" ||
    text === "②" ||
    text === "2" ||
    text === "いいえ" ||
    text.includes("痛みない") ||
    text.includes("痛みなし")
  ) {
    return noPainMenu();
  }

  // 相談したい
  if (
    text === "③ わからない・相談したい" ||
    text === "③" ||
    text === "3" ||
    text.includes("相談") ||
    text.includes("わからない")
  ) {
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

  // 痛みなし後の分類
  if (
    text === "① 詰め物・被せ物" ||
    text === "② 親知らず" ||
    text === "③ 見た目・セラミック" ||
    text === "④ クリーニング" ||
    text === "⑤ その他" ||
    text.includes("詰め") ||
    text.includes("被せ") ||
    text.includes("親知らず") ||
    text.includes("見た目") ||
    text.includes("セラミック") ||
    text.includes("審美") ||
    text.includes("クリーニング") ||
    text.includes("メンテ")
  ) {
    return categoryReply(text);
  }

  // 自由入力のざっくり判定
  if (
    text.includes("痛") ||
    text.includes("腫れ") ||
    text.includes("出血") ||
    text.includes("しみる") ||
    text.includes("ズキズキ") ||
    text.includes("噛むと痛い")
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
    return categoryReply(text);
  }

  return mainMenu();
}

app.post("/webhook", async (req, res) => {
  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") {
        continue;
      }

      const userMessage = event.message.text;
      const replyText = getReplyText(userMessage);

      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: replyText }],
        }),
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => {
  res.send("LINE bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
