/**
 * スプレッドシートへのメニュー情報の書き込みを処理する
 */

/**
 * メニューデータをスプレッドシートに書き込む
 * @param {Array<{date: string, storeName: string, menu: string}>} menuData - 書き込むメニューデータの配列
 * @returns {boolean} 書き込みが成功した場合は true、失敗した場合は false
 */
function writeMenuDataToSpreadsheet(menuData) {
  if (!menuData || menuData.length === 0) {
    console.log('書き込むメニューデータがありません。');
    return true; // データがない場合は成功とみなす
  }

  try {
    const properties = PropertiesService.getScriptProperties();
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      console.error('エラー: スクリプトプロパティ「SPREADSHEET_ID」が設定されていません。');
      return false;
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(MENU_SHEET_NAME);
    if (!sheet) {
      console.error(`エラー: スプレッドシートに「${MENU_SHEET_NAME}」シートが見つかりません。`);
      return false;
    }

    // 書き込むデータを3列（日付, 店名, 弁当名）の配列に変換
    const dataToWrite = menuData.map(item => [item.date, item.storeName, item.menu]);
    
    // 最終行を取得し、その次の行からデータを書き込む
    const startRow = sheet.getLastRow() + 1;
    const range = sheet.getRange(startRow, 1, dataToWrite.length, dataToWrite[0].length);
    
    range.setValues(dataToWrite);
    // 日付が書き込まれるA列の書式を "yyyy-mm-dd" に設定
    sheet.getRange(startRow, 1, dataToWrite.length, 1).setNumberFormat("yyyy-mm-dd");

    console.log(`${dataToWrite.length}件のメニューデータを「${MENU_SHEET_NAME}」シートに書き込みました。`);
    return true;

  } catch (e) {
    console.error(`スプレッドシートへの書き込み中にエラーが発生しました: ${e.message}`);
    console.error(`スタックトレース: ${e.stack}`);
    return false;
  }
}
