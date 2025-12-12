/**
 * Googleスプレッドシートを Excel形式でエクスポートする機能
 */

/**
 * GoogleスプレッドシートをExcel形式でエクスポート
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - エクスポートするスプレッドシート
 * @returns {GoogleAppsScript.Base.Blob} Excelファイルのblob
 */
function exportSpreadsheetAsExcel(spreadsheet) {
  const logger = getContextLogger('exportSpreadsheetAsExcel');
  
  try {
    const spreadsheetId = spreadsheet.getId();
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    const blob = response.getBlob();
    const fileName = spreadsheet.getName() + '.xlsx';
    blob.setName(fileName);
    
    logger.info(`スプレッドシート「${spreadsheet.getName()}」をExcel形式でエクスポートしました。`);
    
    return blob;
    
  } catch (e) {
    handleError(e, 'exportSpreadsheetAsExcel');
    return null;
  }
}

/**
 * 複数のスプレッドシートをExcel形式でエクスポート
 * @param {Object} spreadsheets - スプレッドシートのマップ（キー: 識別子、値: スプレッドシートオブジェクト）
 * @returns {Array<GoogleAppsScript.Base.Blob>} Excelファイルのblob配列
 */
function exportMultipleSpreadsheetsAsExcel(spreadsheets) {
  const logger = getContextLogger('exportMultipleSpreadsheetsAsExcel');
  const blobs = [];
  
  try {
    Object.keys(spreadsheets).forEach(key => {
      const spreadsheet = spreadsheets[key];
      const blob = exportSpreadsheetAsExcel(spreadsheet);
      
      if (blob) {
        blobs.push(blob);
      }
    });
    
    logger.info(`${blobs.length}個のスプレッドシートをExcel形式でエクスポートしました。`);
    
    return blobs;
    
  } catch (e) {
    handleError(e, 'exportMultipleSpreadsheetsAsExcel');
    return blobs;
  }
}
