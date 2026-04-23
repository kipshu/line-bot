
import { CLINIC_NAME, RESERVE_URL, PHONE_NUMBER } from "./config.js";
import { isBusinessOpenNow } from "./time.js";

export function fallbackReply() {
  return `ありがとうございます。

詳しい内容をこのまま送っていただくか、
お電話 ${PHONE_NUMBER} にてご相談ください。

ご予約はこちら
${RESERVE_URL}`;
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

export function painReply(isFollowUp = false) {
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

export function categoryReply(text) {
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

export function consultReply(text) {
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
