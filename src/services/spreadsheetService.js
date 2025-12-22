/**
 * スプレッドシート操作の基底サービス
 * 共通的なスプレッドシート操作を抽象化します
 */

/**
 * スプレッドシート操作を提供する基底クラス
 */
class SpreadsheetService {
  /**
   * @param {string} spreadsheetId スプレッドシートID
   */
  constructor(spreadsheetId) {
    if (!spreadsheetId) {
      throw new AppError('スプレッドシートIDが指定されていません。', 'SpreadsheetService');
    }
    this.spreadsheetId = spreadsheetId;
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  }

  /**
   * 指定された名前のシートを取得
   * @param {string} sheetName シート名
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} シートオブジェクト
   * @throws {AppError} シートが見つからない場合
   */
  getSheet(sheetName) {
    const sheet = this.spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new AppError(`シート「${sheetName}」が見つかりません。`, 'SpreadsheetService');
    }
    return sheet;
  }

  /**
   * シートにデータを書き込む
   * @param {string} sheetName シート名
   * @param {Array<Array<*>>} data 書き込むデータ（2次元配列）
   * @param {number|null} startRow 開始行（nullの場合は最終行の次）
   * @param {number} startColumn 開始列（デフォルト: 1）
   * @returns {Object} Result型のオブジェクト
   */
  writeData(sheetName, data, startRow = null, startColumn = 1) {
    try {
      const sheet = this.getSheet(sheetName);

      if (!data || data.length === 0) {
        return Result.success(0, 'データがないためスキップしました');
      }

      const actualStartRow = startRow !== null ? startRow : sheet.getLastRow() + 1;
      const numRows = data.length;
      const numCols = data[0].length;

      const range = sheet.getRange(actualStartRow, startColumn, numRows, numCols);
      range.setValues(data);

      return Result.success(numRows, `${numRows}件のデータを書き込みました`);
    } catch (e) {
      handleError(e, 'SpreadsheetService.writeData');
      return Result.failure(e, 0);
    }
  }

  /**
   * シートからデータを読み込む
   * @param {string} sheetName シート名
   * @param {number} startRow 開始行（デフォルト: 2、ヘッダーをスキップ）
   * @param {number} startColumn 開始列（デフォルト: 1）
   * @param {number|null} numRows 読み込む行数（nullの場合は最終行まで）
   * @param {number|null} numColumns 読み込む列数（nullの場合はすべて）
   * @returns {Object} Result型のオブジェクト
   */
  readData(sheetName, startRow = 2, startColumn = 1, numRows = null, numColumns = null) {
    try {
      const sheet = this.getSheet(sheetName);
      const lastRow = sheet.getLastRow();

      if (lastRow < startRow) {
        return Result.success([], 'データがありません');
      }

      const actualNumRows = numRows !== null ? numRows : lastRow - startRow + 1;
      const actualNumColumns = numColumns !== null ? numColumns : sheet.getLastColumn();

      const range = sheet.getRange(startRow, startColumn, actualNumRows, actualNumColumns);
      const values = range.getValues();

      return Result.success(values, `${values.length}件のデータを読み込みました`);
    } catch (e) {
      handleError(e, 'SpreadsheetService.readData');
      return Result.failure(e, []);
    }
  }

  /**
   * 特定のセルの値を取得
   * @param {string} sheetName シート名
   * @param {string} cellAddress セルアドレス（例: 'B2'）
   * @returns {Object} Result型のオブジェクト
   */
  getCellValue(sheetName, cellAddress) {
    try {
      const sheet = this.getSheet(sheetName);
      const value = sheet.getRange(cellAddress).getValue();
      return Result.success(value);
    } catch (e) {
      handleError(e, 'SpreadsheetService.getCellValue');
      return Result.failure(e);
    }
  }

  /**
   * 特定のセルに値を設定
   * @param {string} sheetName シート名
   * @param {string} cellAddress セルアドレス（例: 'B2'）
   * @param {*} value 設定する値
   * @returns {Object} Result型のオブジェクト
   */
  setCellValue(sheetName, cellAddress, value) {
    try {
      const sheet = this.getSheet(sheetName);
      sheet.getRange(cellAddress).setValue(value);
      return Result.success(value, 'セルの値を設定しました');
    } catch (e) {
      handleError(e, 'SpreadsheetService.setCellValue');
      return Result.failure(e);
    }
  }

  /**
   * 範囲に書式を設定
   * @param {string} sheetName シート名
   * @param {number} startRow 開始行
   * @param {number} startColumn 開始列
   * @param {number} numRows 行数
   * @param {number} numColumns 列数
   * @param {string} format 書式文字列（例: 'yyyy-mm-dd'）
   * @returns {Object} Result型のオブジェクト
   */
  setNumberFormat(sheetName, startRow, startColumn, numRows, numColumns, format) {
    try {
      const sheet = this.getSheet(sheetName);
      sheet.getRange(startRow, startColumn, numRows, numColumns).setNumberFormat(format);
      return Result.success(true, '書式を設定しました');
    } catch (e) {
      handleError(e, 'SpreadsheetService.setNumberFormat');
      return Result.failure(e, false);
    }
  }

  /**
   * シートの最終行番号を取得
   * @param {string} sheetName シート名
   * @returns {number} 最終行番号
   */
  getLastRow(sheetName) {
    const sheet = this.getSheet(sheetName);
    return sheet.getLastRow();
  }

  /**
   * シートの最終列番号を取得
   * @param {string} sheetName シート名
   * @returns {number} 最終列番号
   */
  getLastColumn(sheetName) {
    const sheet = this.getSheet(sheetName);
    return sheet.getLastColumn();
  }
}

/**
 * SpreadsheetServiceのシングルトンインスタンスを取得
 * @returns {SpreadsheetService} SpreadsheetServiceインスタンス
 */
function getSpreadsheetService() {
  if (!globalThis._spreadsheetServiceInstance) {
    const propertyManager = getPropertyManager();
    const spreadsheetId = propertyManager.getSpreadsheetId();
    globalThis._spreadsheetServiceInstance = new SpreadsheetService(spreadsheetId);
  }
  return globalThis._spreadsheetServiceInstance;
}
