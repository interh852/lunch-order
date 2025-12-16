/**
 * 注文スナップショット管理サービス
 * オーダー送信時の注文状態をスプレッドシートに保存し、変更検知時に使用する
 */

/**
 * スナップショットシートを取得または作成
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} スナップショットシート
 */
function getOrCreateSnapshotSheet() {
  const logger = getContextLogger('getOrCreateSnapshotSheet');
  
  try {
    const spreadsheetService = getSpreadsheetService();
    const spreadsheet = spreadsheetService.spreadsheet;
    
    let sheet = spreadsheet.getSheetByName(SNAPSHOT_SHEET_NAME);
    
    // シートが存在しない場合は新規作成
    if (!sheet) {
      logger.info(`「${SNAPSHOT_SHEET_NAME}」シートを新規作成します。`);
      sheet = spreadsheet.insertSheet(SNAPSHOT_SHEET_NAME);
      
      // ヘッダー行を設定
      const headers = ['期間キー', '日付', '注文者', 'サイズ', '保存日時'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダー行の書式設定
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f3f3');
      
      // 列幅を調整
      sheet.setColumnWidth(1, 150); // 期間キー
      sheet.setColumnWidth(2, 100); // 日付
      sheet.setColumnWidth(3, 120); // 注文者
      sheet.setColumnWidth(4, 80);  // サイズ
      sheet.setColumnWidth(5, 150); // 保存日時
      
      // シートを固定
      sheet.setFrozenRows(1);
      
      logger.info(`「${SNAPSHOT_SHEET_NAME}」シートを作成しました。`);
    }
    
    return sheet;
    
  } catch (e) {
    handleError(e, 'getOrCreateSnapshotSheet');
    throw e;
  }
}

/**
 * 期間キーを生成
 * @param {string} startDate - 開始日 (YYYY/MM/DD)
 * @param {string} endDate - 終了日 (YYYY/MM/DD)
 * @returns {string} 期間キー (例: "2025.12.16-12.20")
 */
function generatePeriodKey(startDate, endDate) {
  // YYYY/MM/DD から YYYY, MM, DD を抽出
  const startParts = startDate.split('/');
  const endParts = endDate.split('/');
  
  const startYear = startParts[0];
  const startMonth = startParts[1];
  const startDay = startParts[2];
  const endMonth = endParts[1];
  const endDay = endParts[2];
  
  // 年をまたぐ場合も考慮
  return `${startYear}.${startMonth}.${startDay}-${endMonth}.${endDay}`;
}

/**
 * 注文スナップショットを保存（同期間の既存データは自動削除）
 * @param {string} periodKey - 期間キー（例: "12.16-12.20"）
 * @param {Array<Object>} orders - 注文データ配列 [{date, name, size}, ...]
 */
function saveOrderSnapshot(periodKey, orders) {
  const logger = getContextLogger('saveOrderSnapshot');
  
  try {
    if (!orders || orders.length === 0) {
      logger.warn('保存する注文データがありません。');
      return;
    }
    
    logger.info(`スナップショット保存開始: 期間=${periodKey}, 件数=${orders.length}`);
    
    const sheet = getOrCreateSnapshotSheet();
    
    // 同じ期間キーの既存データを削除
    deleteSnapshotRows(sheet, periodKey);
    
    // 新しいスナップショットを追加
    const now = new Date();
    const rowsToAdd = [];
    
    orders.forEach(order => {
      // サイズを正規化して保存
      const normalizedSize = normalizeSizeCategory(order.size);
      
      rowsToAdd.push([
        periodKey,
        order.date,
        order.name,
        normalizedSize,
        now
      ]);
    });
    
    if (rowsToAdd.length > 0) {
      // 最終行の次に追加
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rowsToAdd.length, 5).setValues(rowsToAdd);
      logger.info(`スナップショット ${rowsToAdd.length}件を保存しました。`);
    }
    
  } catch (e) {
    handleError(e, 'saveOrderSnapshot');
    throw e;
  }
}

/**
 * スナップショットを読み込み
 * @param {string} periodKey - 期間キー
 * @returns {Array<Object>|null} 注文データ配列 or null
 */
function loadOrderSnapshot(periodKey) {
  const logger = getContextLogger('loadOrderSnapshot');
  
  try {
    const sheet = getOrCreateSnapshotSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      logger.debug(`スナップショットが存在しません（シートが空）。`);
      return null;
    }
    
    // 全データを取得（ヘッダー除く）
    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    
    // 指定された期間キーのデータをフィルタリング
    const orders = [];
    data.forEach(row => {
      if (row[SNAPSHOT_COLUMNS.PERIOD_KEY] === periodKey) {
        orders.push({
          date: formatDateToString(row[SNAPSHOT_COLUMNS.ORDER_DATE]),
          name: row[SNAPSHOT_COLUMNS.ORDER_NAME],
          size: row[SNAPSHOT_COLUMNS.ORDER_SIZE]
        });
      }
    });
    
    if (orders.length === 0) {
      logger.debug(`期間キー「${periodKey}」のスナップショットが見つかりません。`);
      return null;
    }
    
    logger.info(`スナップショット読み込み: 期間=${periodKey}, 件数=${orders.length}`);
    return orders;
    
  } catch (e) {
    handleError(e, 'loadOrderSnapshot');
    return null;
  }
}

/**
 * スナップショットの存在確認
 * @param {string} periodKey - 期間キー
 * @returns {boolean} 存在する場合true
 */
function hasSnapshot(periodKey) {
  const snapshot = loadOrderSnapshot(periodKey);
  return snapshot !== null && snapshot.length > 0;
}

/**
 * 指定期間キーの行を削除（内部関数）
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - シート
 * @param {string} periodKey - 期間キー
 */
function deleteSnapshotRows(sheet, periodKey) {
  const logger = getContextLogger('deleteSnapshotRows');
  
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return; // ヘッダーのみの場合は何もしない
    
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const rowsToDelete = [];
    
    // 削除対象の行番号を収集（後ろから）
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][0] === periodKey) {
        rowsToDelete.push(i + 2); // 行番号は1始まり、ヘッダー分+1
      }
    }
    
    // 行を削除（後ろから削除しないと行番号がずれる）
    rowsToDelete.forEach(rowNum => {
      sheet.deleteRow(rowNum);
    });
    
    if (rowsToDelete.length > 0) {
      logger.info(`期間キー「${periodKey}」の既存スナップショット ${rowsToDelete.length}件を削除しました。`);
    }
    
  } catch (e) {
    handleError(e, 'deleteSnapshotRows');
    throw e;
  }
}

/**
 * 日付オブジェクトをYYYY/MM/DD形式の文字列に変換
 * @param {Date|string} date - 日付
 * @returns {string} YYYY/MM/DD形式の文字列
 */
function formatDateToString(date) {
  if (typeof date === 'string') {
    return date;
  }
  
  if (date instanceof Date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), DATE_FORMATS.YYYY_MM_DD_SLASH);
  }
  
  return '';
}
