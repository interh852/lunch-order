/**
 * スプレッドシートからランチ注文データを取得するユーティリティ関数を提供します。
 */

/**
 * 指定された期間内にメニューデータが存在するか確認します。
 *
 * @param {string[]} dateStrings YYYY/MM/DD形式の日付文字列の配列。
 * @returns {boolean} メニューが存在すればtrue、存在しなければfalse。
 */
function hasMenuForRange(dateStrings) {
  const logger = getContextLogger('hasMenuForRange');
  try {
    const spreadsheetService = getSpreadsheetService();
    const readResult = spreadsheetService.readData(MENU_SHEET_NAME);

    if (Result.isFailure(readResult)) {
      logger.error('メニューデータの読み込みに失敗しました。');
      return false;
    }

    const values = readResult.data;
    if (values.length === 0) {
      logger.debug('「メニュー」シートにデータがありません。');
      return false;
    }

    // 「メニュー」シートの日付列をスキャンして、対象の日付が1つでも存在するかチェック
    return dateStrings.some((targetDateStr) => {
      return values.some((row) => {
        const menuDate = row[MENU_COLUMNS.DATE];
        if (menuDate instanceof Date) {
          const menuDateStr = Utilities.formatDate(
            menuDate,
            Session.getScriptTimeZone(),
            DATE_FORMATS.YYYY_MM_DD_SLASH
          );
          return menuDateStr === targetDateStr;
        }
        return false;
      });
    });
  } catch (e) {
    handleError(e, 'hasMenuForRange');
    return false;
  }
}

/**
 * 次回のランチ注文データをスプレッドシートから取得します。
 *
 * @param {string[]} nextWeekdays YYYY/MM/DD形式の次回の日付文字列の配列。
 * @returns {Array<Object>|null} 注文データの配列。各オブジェクトは { date: string, name: string, size: string, count: number } の形式。取得に失敗した場合は null。
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
    nextWeekdays.forEach((targetDateStr) => {
      values.forEach((row) => {
        // スプレッドシートの日付データをYYYY/MM/DD形式に整形して比較
        const orderDate = row[ORDER_HISTORY_COLUMNS.ORDER_DATE];
        if (orderDate instanceof Date) {
          const orderDateStr = Utilities.formatDate(
            orderDate,
            Session.getScriptTimeZone(),
            DATE_FORMATS.YYYY_MM_DD_SLASH
          );
          if (orderDateStr === targetDateStr) {
            const name = row[ORDER_HISTORY_COLUMNS.ORDER_PERSON_NAME];
            const size = row[ORDER_HISTORY_COLUMNS.ORDER_SIZE];
            // 個数を取得（数値に変換、空や不正な値の場合は1をデフォルトにする）
            const countValue = row[ORDER_HISTORY_COLUMNS.ORDER_COUNT];
            const count = countValue && !isNaN(countValue) ? Number(countValue) : 1;

            if (name && size) {
              // 注文者名とサイズが空でないことを確認
              orders.push({
                date: orderDateStr,
                name: name,
                size: size,
                count: count,
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
