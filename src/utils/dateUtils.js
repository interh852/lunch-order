/**
 * 日付関連のユーティリティ関数を提供します。
 */

/**
 * 指定された日付から次の週の月曜日から金曜日までの日付をYYYY/MM/DD形式の文字列で取得します。
 * 基準日が木曜日であることを想定していますが、任意の日付から計算可能です。
 *
 * @param {Date} baseDate 基準となる日付オブジェクト。
 * @returns {string[]} 次の週の月曜日から金曜日までの日付文字列の配列 (例: ['2023/12/25', '2023/12/26', ..., '2023/12/29'])。
 */
function getNextWeekdays(baseDate) {
  const nextWeekdays = [];
  const oneDay = 24 * 60 * 60 * 1000; // 1日のミリ秒

  // baseDateの0時0分0秒を設定
  const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  // baseDateの曜日 (0:日, 1:月, ..., 6:土)
  const dayOfWeek = current.getDay();

  // 次の月曜日を計算
  let nextMonday = new Date(current.getTime());
  const daysUntilNextMonday = (1 - dayOfWeek + 7) % 7;
  nextMonday.setDate(current.getDate() + (daysUntilNextMonday === 0 ? 7 : daysUntilNextMonday));

  // YYYY/MM/DD形式の関数
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // 月曜日から金曜日までをループ
  for (let i = 0; i < 5; i++) {
    const day = new Date(nextMonday.getTime() + i * oneDay);
    nextWeekdays.push(formatDate(day));
  }

  return nextWeekdays;
}

/**
 * 指定された日付から今週の月曜日から金曜日までの日付をYYYY/MM/DD形式の文字列で取得します。
 *
 * @param {Date} baseDate 基準となる日付オブジェクト。
 * @returns {string[]} 今週の月曜日から金曜日までの日付文字列の配列 (例: ['2025/12/16', '2025/12/17', ..., '2025/12/20'])。
 */
function getCurrentWeekdays(baseDate) {
  const currentWeekdays = [];
  const oneDay = 24 * 60 * 60 * 1000; // 1日のミリ秒

  // baseDateの0時0分0秒を設定
  const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  // baseDateの曜日 (0:日, 1:月, ..., 6:土)
  const dayOfWeek = current.getDay();

  // 今週の月曜日を計算
  let currentMonday = new Date(current.getTime());
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 日曜日の場合は前週の月曜日
  currentMonday.setDate(current.getDate() - daysFromMonday);

  // YYYY/MM/DD形式の関数
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // 月曜日から金曜日までをループ
  for (let i = 0; i < 5; i++) {
    const day = new Date(currentMonday.getTime() + i * oneDay);
    currentWeekdays.push(formatDate(day));
  }

  return currentWeekdays;
}

/**
 * YYYY/MM/DD形式の日付文字列から、MM/DD (曜日) 形式の文字列を生成します。
 * @param {string} dateString YYYY/MM/DD形式の日付文字列
 * @returns {string} MM/DD (曜日) 形式の文字列 (例: '12/25 (月)')
 */
function formatJapaneseDateWithDay(dateString) {
  const date = new Date(dateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = days[date.getDay()];
  return `${month}/${day} (${dayOfWeek})`;
}
