let holidayCache = null;
let holidayCacheDate = "";

export async function fetchJapaneseHolidays() {
  const today = new Date().toISOString().slice(0, 10);

  if (holidayCache && holidayCacheDate === today) {
    return holidayCache;
  }

  try {
    const response = await fetch("https://holidays-jp.github.io/api/v1/date.json");

    if (!response.ok) {
      throw new Error("holiday api failed");
    }

    const data = await response.json();

    holidayCache = data;
    holidayCacheDate = today;

    return data;
  } catch (_error) {
    return {};
  }
}

export async function isJapaneseHoliday(dateStr) {
  const holidays = await fetchJapaneseHolidays();
  return Boolean(holidays[dateStr]);
}
