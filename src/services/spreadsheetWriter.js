/**
 * スプレッドシートへのメニュー情報の書き込みを処理する
 */

/**
 * メニューデータをスプレッドシートに書き込む
 * @param {Array<{date: string, storeName: string, menu: string}>} menuData - 書き込むメニューデータの配列
 * @returns {Object} Result型のオブジェクト
 */
function writeMenuDataToSpreadsheet(menuData) {
  const logger = getContextLogger('writeMenuDataToSpreadsheet');
  
  if (!menuData || menuData.length === 0) {
    logger.debug('書き込むメニューデータがありません。');
    return Result.success(null, 'データがないため処理をスキップしました');
  }

  try {
    const spreadsheetService = getSpreadsheetService();
    
    // 書き込むデータを3列（日付, 店名, 弁当名）の配列に変換
    const dataToWrite = menuData.map(item => [item.date, item.storeName, item.menu]);
    
    // データを書き込む
    const writeResult = spreadsheetService.writeData(MENU_SHEET_NAME, dataToWrite);
    
    if (Result.isFailure(writeResult)) {
      return writeResult;
    }
    
    // 日付が書き込まれるA列の書式を "yyyy-mm-dd" に設定
    const startRow = spreadsheetService.getLastRow(MENU_SHEET_NAME) - dataToWrite.length + 1;
    spreadsheetService.setNumberFormat(MENU_SHEET_NAME, startRow, 1, dataToWrite.length, 1, DATE_FORMATS.YYYY_MM_DD_HYPHEN);

    logger.info(`${dataToWrite.length}件のメニューデータを「${MENU_SHEET_NAME}」シートに書き込みました。`);
    return Result.success(dataToWrite.length, `${dataToWrite.length}件のメニューデータを書き込みました`);

  } catch (e) {
    handleError(e, 'writeMenuDataToSpreadsheet');
    return Result.failure(e, 0);
  }
}
