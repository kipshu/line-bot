export const CLINIC_NAME = "大畑歯科口腔外科 世田谷分院";
export const RESERVE_URL = "https://www.ohata-dental.jp/setagaya/index.html";
export const PHONE_NUMBER = "03-5779-9225";

export const BUSINESS_HOURS = {
  0: { start: "09:00", end: "16:00" }, // 日
  1: { start: "10:00", end: "19:00" }, // 月
  2: { start: "10:00", end: "19:00" }, // 火
  3: { start: "10:00", end: "19:00" }, // 水
  4: { start: "10:00", end: "19:00" }, // 木
  5: { start: "10:00", end: "19:00" }, // 金
  6: { start: "10:00", end: "19:00" }, // 土
};

export const KEYWORDS = {
  urgent: [
    "痛い",
    "激痛",
    "かなり痛い",
    "ズキズキ",
    "腫れ",
    "大きく腫れた",
    "出血",
    "止まらない",
    "血が止まらない",
    "寝られない",
    "眠れない",
    "急ぎ",
    "今すぐ",
    "今日",
    "事故",
    "ぶつけた",
    "抜けた",
  ],

  broken: [
    "欠けた",
    "割れた",
    "ヒビ",
    "ひび",
    "折れた",
  ],

  filling: [
    "詰め物",
    "詰め",
    "銀歯",
    "被せ物",
    "被せ",
    "取れた",
    "外れた",
    "ぐらぐら",
    "グラグラ",
  ],

  mildPain: [
    "しみる",
    "冷たい",
    "熱い",
    "違和感",
    "少し痛い",
    "噛むと痛い",
    "軽い痛み",
  ],

  gum: [
    "歯ぐき",
    "歯茎",
    "歯周病",
    "口臭",
    "膿",
    "うみ",
  ],

  wisdom: [
    "親知らず",
    "親不知",
    "抜歯",
  ],

  denture: [
    "入れ歯",
    "義歯",
    "合わない",
    "外れる",
    "噛めない",
  ],

  esthetic: [
    "ホワイトニング",
    "歯を白く",
    "白くしたい",
    "見た目",
    "審美",
    "セラミック",
    "白い歯",
    "銀歯を白く",
  ],

  cleaning: [
    "クリーニング",
    "歯石",
    "歯石取り",
    "メンテ",
    "定期検診",
    "クリーニングしたい",
    "歯の掃除",
  ],

  child: [
    "子ども",
    "こども",
    "子供",
    "乳歯",
    "フッ素",
    "学校検診",
  ],
};

export const KEYWORD_PRIORITY = [
  "urgent",
  "broken",
  "filling",
  "mildPain",
  "gum",
  "wisdom",
  "denture",
  "esthetic",
  "cleaning",
  "child",
];
