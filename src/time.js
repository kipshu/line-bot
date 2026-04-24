import { BUSINESS_HOURS, SPECIAL_CLOSED } from "./config.js";
import { isJapaneseHoliday } from "./holidays.js";

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isInRange(dateStr, ranges = []) {
  return ranges.some((r) => dateStr >= r.start && dateStr <= r.end);
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
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const weekdayMap = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };

  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    day: weekdayMap[map.weekday],
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export async function isBusinessOpenNow() {
  const now = getTokyoNowParts();

  if (isInRange(now.dateStr, SPECIAL_CLOSED)) {
    return false;
  }

  if (await isJapaneseHoliday(now.dateStr)) {
    return false;
  }

  const schedule = BUSINESS_HOURS[now.day];
  if (!schedule) return false;

  const currentMinutes = now.hour * 60 + now.minute;
  const startMinutes = toMinutes(schedule.start);
  const endMinutes = toMinutes(schedule.end);

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
