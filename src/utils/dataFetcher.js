/**
 * スプレッドシートからランチ注文データを取得するユーティリティ関数を提供します。
 */

/**
 * 次週のランチ注文データをスプレッドシートから取得します。
 *
 * スプレッドシートの「注文履歴」シートから、指定された日付範囲に一致する注文データを抽出します。
 * 注文データは「対象日付」、「注文者名」、「サイズ」の形式で取得することを想定しています。
 * 想定される列は以下の通りです（0-indexed）：
 * - 対象日付: 3 (D列)
 * - 注文者名: 2 (C列)
 * - サイズ: 6 (G列)
 *
 * @param {string[]} nextWeekdays YYYY/MM/DD形式の次週の日付文字列の配列。
 * @returns {Array<Object>} 取得した注文データの配列。各オブジェクトは { date: string, name: string, size: string } の形式。
 */
function getLunchOrdersForNextWeek(nextWeekdays) {
  const logger = getContextLogger('getLunchOrdersForNextWeek');
  try {
    const spreadsheetService = getSpreadsheetService();
    
    // データを読み込む
    const readResult = spreadsheetService.readData(ORDER_HISTORY_SHEET_NAME);
    
    if (Result.isFailure(readResult)) {
      logger.error('注文履歴データの読み込みに失敗しました。');
      return [];
    }
    
    const values = readResult.data;
    if (values.length === 0) {
      logger.debug('「注文履歴」シートにデータがありません。');
      return [];
    }

    const orders = [];
    nextWeekdays.forEach(targetDateStr => {
      values.forEach(row => {
        // スプレッドシートの日付データをYYYY/MM/DD形式に整形して比較
        const orderDate = row[ORDER_HISTORY_COLUMNS.ORDER_DATE];
        if (orderDate instanceof Date) {
          const orderDateStr = Utilities.formatDate(orderDate, Session.getScriptTimeZone(), DATE_FORMATS.YYYY_MM_DD_SLASH);
          if (orderDateStr === targetDateStr) {
            const name = row[ORDER_HISTORY_COLUMNS.ORDER_PERSON_NAME];
            const size = row[ORDER_HISTORY_COLUMNS.ORDER_SIZE];
            // 個数を取得（数値に変換、空や不正な値の場合は1をデフォルトにする）
            const countValue = row[ORDER_HISTORY_COLUMNS.ORDER_COUNT];
            const count = (countValue && !isNaN(countValue)) ? Number(countValue) : 1;
            
            if (name && size) { // 注文者名とサイズが空でないことを確認
              orders.push({
                date: orderDateStr,
                name: name,
                size: size,
                count: count
              });
            }
          }
        }
      });
    });

    return orders;
  } catch (e) {
    handleError(e, 'getLunchOrdersForNextWeek');
    return [];
  }
}
