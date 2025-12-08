/**
 * スプレッドシートからランチ注文データを取得するユーティリティ関数を提供します。
 */

/**
 * 次週のランチ注文データをスプレッドシートから取得します。
 *
 * スプレッドシートの「注文履歴」シートから、指定された日付範囲に一致する注文データを抽出します。
 * 注文データは「対象日付」、「注文者名」、「サイズ」の形式で取得することを想定しています。
 * 想定される列は以下の通りです（0-indexed）：
 * - 対象日付: 0 (A列)
 * - 注文者名: 1 (B列)
 * - サイズ: 2 (C列)
 *
 * @param {string[]} nextWeekdays YYYY/MM/DD形式の次週の日付文字列の配列。
 * @returns {Array<Object>} 取得した注文データの配列。各オブジェクトは { date: string, name: string, size: string } の形式。
 */
function getLunchOrdersForNextWeek(nextWeekdays) {
  const spreadsheetId = getSpreadsheetIdFromProperties();
  if (!spreadsheetId) {
    return [];
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(ORDER_HISTORY_SHEET_NAME);
    if (!sheet) {
      console.error(`エラー: スプレッドシートに「${ORDER_HISTORY_SHEET_NAME}」シートが見つかりません。`);
      return [];
    }

    // ヘッダー行を除いてデータを取得
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) { // ヘッダー行のみ、またはデータなし
      console.log('「注文履歴」シートにデータがありません。');
      return [];
    }
    const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const values = range.getValues();

    const orders = [];
    nextWeekdays.forEach(targetDateStr => {
      values.forEach(row => {
        // スプレッドシートの日付データをYYYY/MM/DD形式に整形して比較
        const orderDate = row[3]; // 対象日付 (D列)
        if (orderDate instanceof Date) {
          const orderDateStr = Utilities.formatDate(orderDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
          if (orderDateStr === targetDateStr) {
            const name = row[2]; // 注文者名 (C列)
            const size = row[6]; // サイズ (G列)
            if (name && size) { // 注文者名とサイズが空でないことを確認
              orders.push({
                date: orderDateStr,
                name: name,
                size: size
              });
            }
          }
        }
      });
    });

    return orders;
  } catch (e) {
    console.error(`ランチ注文データの取得中にエラーが発生しました: ${e.message}`);
    return [];
  }
}

/**
 * スクリプトプロパティからスプレッドシートIDを取得します。
 * @returns {string|null} スプレッドシートID、または未設定の場合はnull
 */
function getSpreadsheetIdFromProperties() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    console.error('エラー: スクリプトプロパティ「SPREADSHEET_ID」が設定されていません。');
    return null;
  }
  return spreadsheetId;
}
