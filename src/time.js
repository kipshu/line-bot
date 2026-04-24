import { BUSINESS_HOURS, SPECIAL_CLOSED } from "./config.js";
import { isJapaneseHoliday } from "./holidays.js";

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isInRange(dateStr, ranges) {
  return ranges.some(r => dateStr >= r.start && dateStr <= r.end);
}

export function getTokyoNowParts() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());

  const map = {};
  parts.forEach(p => (map[p.type] = p.value));

  const w = { 日:0, 月:1, 火:2, 水:3, 木:4, 金:5, 土:6 };

  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    day: w[map.weekday],
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export async function isBusinessOpenNow() {
  const now = getTokyoNowParts();

  if (isInRange(now.dateStr, SPECIAL_CLOSED)) return false;
  if (await isJapaneseHoliday(now.dateStr)) return false;

  const s = BUSINESS_HOURS[now.day];
  if (!s) return false;

  const cur = now.hour * 60 + now.minute;
  return cur >= toMinutes(s.start) && cur < toMinutes(s.end);
}
