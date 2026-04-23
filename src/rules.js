
import { KEYWORDS, PHONE_NUMBER, RESERVE_URL } from "./config.js";
import { getUserState, setUserState } from "./state.js";
import {
  mainMenu,
  noPainMenu,
  painReply,
  categoryReply,
  consultReply,
} from "./replies.js";

function normalizeText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detailedRuleReply(text) {
  if (includesAny(text, KEYWORDS.urgent)) {
    return painReply();
  }

  if (includesAny(text, KEYWORDS.mildPain)) {
    return `しみる・違和感がある場合は、早めの確認をおすすめします。

症状が強い場合はお電話でのご案内が最短です。
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.filling)) {
    return `詰め物・被せ物が外れた可能性があります。

早めの受診をおすすめします。

ご予約はこちら
${RESERVE_URL}

お急ぎの場合はお電話ください
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.broken)) {
    return `歯が欠けた・割れた可能性があります。

早めの確認をおすすめします。

お急ぎの場合はお電話ください
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.wisdom)) {
    return `親知らずのご相談ですね。

当院では口腔外科系のご相談にも対応しています。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.gum)) {
    return `歯ぐきの症状がある場合は、早めの確認をおすすめします。

症状が強い場合はお電話ください
${PHONE_NUMBER}

ご予約はこちら
${RESERVE_URL}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.cleaning)) {
    return `クリーニング・検診のご相談ですね。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.esthetic)) {
    return `見た目・セラミックのご相談ですね。

カウンセリング予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.denture)) {
    return `入れ歯のご相談ですね。

痛みや違和感がある場合は、早めの受診をおすすめします。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  if (includesAny(text, KEYWORDS.child)) {
    return `お子さまの歯のご相談ですね。

ご予約はこちら
${RESERVE_URL}

お電話でのご相談
${PHONE_NUMBER}

最初に戻る場合は「メニュー」と送ってください。`;
  }

  return null;
}

export function getRuleBasedReply(userMessage, userId) {
  const text = normalizeText(userMessage);
  const lower = text.toLowerCase();
  const state = getUserState(userId);

  if (
    lower === "menu" ||
    text === "メニュー" ||
    text === "最初" ||
    text === "戻る"
  ) {
    setUserState(userId, { category: null, painCount: 0, lastReply: "menu" });
    return mainMenu();
  }

  const isPainLike =
    text === "① はい（痛み・腫れがある）" ||
    text === "①" ||
    text === "1" ||
    text === "はい" ||
    text.includes("痛みあり") ||
    text.includes("腫れあり") ||
    text.includes("痛") ||
    text.includes("腫れ") ||
    text.includes("出血") ||
    text.includes("しみる") ||
    text.includes("ズキズキ") ||
    text.includes("噛むと痛い");

  if (isPainLike) {
    const nextPainCount = (state.painCount || 0) + 1;
    setUserState(userId, {
      category: "pain",
      painCount: nextPainCount,
      lastReply: "pain",
    });
    return painReply(nextPainCount >= 2);
  }

  if (
    text === "② いいえ（痛み・腫れはない）" ||
    text === "②" ||
    text === "2" ||
    text === "いいえ" ||
    text.includes("痛みない") ||
    text.includes("痛みなし")
  ) {
    setUserState(userId, { category: "no_pain", painCount: 0, lastReply: "no_pain" });
    return noPainMenu();
  }

  if (
    text === "③ わからない・相談したい" ||
    text === "③" ||
    text === "3" ||
    text.includes("相談") ||
    text.includes("わからない")
  ) {
    setUserState(userId, { category: "consult", painCount: 0, lastReply: "consult" });
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

  const category = categoryReply(text);
  if (category) {
    setUserState(userId, { category: "category", painCount: 0, lastReply: "category" });
    return category;
  }

  const detailed = detailedRuleReply(text);
  if (detailed) {
    const painLikeDetailed =
      includesAny(text, KEYWORDS.urgent) || includesAny(text, KEYWORDS.mildPain);

    if (painLikeDetailed) {
      const nextPainCount = (state.painCount || 0) + 1;
      setUserState(userId, {
        category: "pain",
        painCount: nextPainCount,
        lastReply: "pain",
      });
      return painReply(nextPainCount >= 2);
    }

    setUserState(userId, { category: "detailed", painCount: 0, lastReply: "detailed" });
    return detailed;
  }

  const consult = consultReply(text);
  if (consult) {
    setUserState(userId, { category: "consult", painCount: 0, lastReply: "consult" });
    return consult;
  }

  return null;
}
