let holidayCache = null;
let fetchedAt = 0;

const URL = "https://holidays-jp.github.io/api/v1/date.json";
const TTL = 1000 * 60 * 60 * 24;

export async function fetchJapaneseHolidays() {
  const now = Date.now();

  if (holidayCache && now - fetchedAt < TTL) {
    return holidayCache;
  }

  try {
    const res = await fetch(URL);
    if (!res.ok) throw new Error();

    const data = await res.json();
    holidayCache = data;
    fetchedAt = now;

    return data;
  } catch {
    return {};
  }
}

export async function isJapaneseHoliday(dateStr) {
  const data = await fetchJapaneseHolidays();
  return Boolean(data[dateStr]);
}
