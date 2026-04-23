
import { BUSINESS_HOURS } from "./config.js";

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function getTokyoNowParts() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour12: false,
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
    day: weekdayMap[map.weekday],
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

export function isBusinessOpenNow() {
  const now = getTokyoNowParts();
  const schedule = BUSINESS_HOURS[now.day];
  if (!schedule) return false;

  const currentMinutes = now.hour * 60 + now.minute;
  return (
    currentMinutes >= toMinutes(schedule.start) &&
    currentMinutes <= toMinutes(schedule.end)
  );
}
