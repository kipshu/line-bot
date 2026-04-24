import { CLINIC_NAME, RESERVE_URL, PHONE_NUMBER, KEYWORDS } from "./config.js";
import { isBusinessOpenNow } from "./time.js";

function hasAny(text, words = []) {
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

export function fallbackReply() {
  return `ありがとうございます。

詳しい内容をこのまま送っていただくか、
お電話にてご相談ください。

${phoneLine()}

${reserveLine()}`;
}

export function mainMenu() {
  return `${CLINIC_NAME}です。

今、痛みや腫れはありますか？

① はい（痛み・腫れがある）
② いいえ（痛み・腫れはない）
③ わからない・相談したい

※ 最初に戻るときは「メニュー」と送ってください。`;
}

export function noPainMenu() {
  return `ご希望に近いものを選んでください。

① 詰め物・被せ物
② 親知らず
③ 見た目・セラミック
④ クリーニング
⑤ その他

※ 最初に戻るときは「メニュー」と送ってください。`;
}

export async function painReply(isFollowUp = false) {
  const openNow = await isBusinessOpenNow();

  if (openNow) {
    if (isFollowUp) {
      return `症状が強い可能性があります。

本日対応できる可能性があります。
お電話でのご案内が最短です。

${phoneLine("お急ぎの場合はこちら")}`;
    }

    return `痛み・腫れがある場合は、早めの確認をおすすめします。

本日対応できる可能性があります。
まずはお電話ください。

${phoneLine("お電話はこちら")}

このまま
・どこが痛むか
・腫れがあるか
・いつからか
を送っていただければ、受付確認用の内容としてお預かりできます。

${reserveLine()}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (isFollowUp) {
    return `症状が強い可能性があります。

お急ぎの場合は、
まずはお電話でご確認ください。

${phoneLine("お急ぎの場合はこちら")}

${reserveLine()}`;
  }

  return `痛み・腫れがある場合は、早めの確認をおすすめします。
現在は診療時間外です。

お急ぎの場合は、まずはお電話でご確認ください。

${phoneLine("お急ぎの場合はこちら")}

${reserveLine()}

強い痛み・強い腫れ・出血がある場合は、無理をせず早めの相談をご検討ください。

最初に戻る場合は「メニュー」と送ってください。`;
}

export function categoryReply(text) {
  if (text === "1" || text === "①" || hasAny(text, KEYWORDS.filling)) {
    return `詰め物・被せ物のご相談ですね。

${reserveLine()}

${phoneLine("お電話でのご相談")}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (text === "2" || text === "②" || hasAny(text, KEYWORDS.wisdom)) {
    return `親知らずのご相談ですね。

当院では口腔外科系のご相談にも対応しています。

${reserveLine()}

${phoneLine("お電話でのご相談")}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (text === "3" || text === "③" || hasAny(text, KEYWORDS.esthetic)) {
    return `見た目・セラミックのご相談ですね。

${reserveLine("カウンセリング予約はこちら（24時間受付）")}

${phoneLine("お電話でのご相談")}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (text === "4" || text === "④" || hasAny(text, KEYWORDS.cleaning)) {
    return `クリーニング・メンテナンスのご相談ですね。

${reserveLine()}

${phoneLine("お電話でのご相談")}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (text === "5" || text === "⑤" || text.includes("その他")) {
    return `ありがとうございます。

詳しい内容をこのままメッセージで送っていただくか、
お電話でご相談ください。

${phoneLine()}

${reserveLine()}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  return null;
}

export async function consultReply(text) {
  if (
    hasAny(text, KEYWORDS.urgent) ||
    hasAny(text, KEYWORDS.mildPain) ||
    hasAny(text, KEYWORDS.broken) ||
    hasAny(text, KEYWORDS.filling)
  ) {
    return await painReply();
  }

  if (
    hasAny(text, KEYWORDS.wisdom) ||
    hasAny(text, KEYWORDS.esthetic) ||
    hasAny(text, KEYWORDS.cleaning) ||
    hasAny(text, KEYWORDS.gum) ||
    hasAny(text, KEYWORDS.denture) ||
    hasAny(text, KEYWORDS.child)
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
