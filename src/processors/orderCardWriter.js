/**
 * 注文内容を集計してオーダーカードに転記するプロセッサー
 */

/**
 * 次週の注文内容を集計してオーダーカードに転記する
 * オーダーカードフォルダから最新のスプレッドシートを取得し、
 * 注文履歴から次週分の注文を日付×サイズで集計して書き込みます
 */
function writeOrdersToOrderCard() {
  const logger = getContextLogger('writeOrdersToOrderCard');
  logger.info('=== オーダーカード転記処理開始 ===');
  
  try {
    // 1. 次週の平日を取得（文字列配列: YYYY/MM/DD）
    const nextWeekdays = getNextWeekdays(new Date());
    logger.info(`対象期間: ${nextWeekdays[0]} 〜 ${nextWeekdays[nextWeekdays.length - 1]}`);
    
    // 2. 次週の注文内容を取得
    const orders = getLunchOrdersForNextWeek(nextWeekdays);
    logger.info(`注文データ: ${orders.length}件`);
    
    if (orders.length === 0) {
      logger.warn('次週の注文データがありません。');
      return;
    }
    
    // 3. 日付×サイズごとに集計
    const aggregatedOrders = aggregateOrdersByDateAndSize(orders);
    logger.debug('集計結果:', JSON.stringify(aggregatedOrders, null, 2));
    
    // 4. 次週の日付文字列を月ごとにグループ化
    const datesByMonth = groupDateStringsByMonth(nextWeekdays);
    logger.info(`対象月数: ${Object.keys(datesByMonth).length}ヶ月`);
    
    // 5. 月ごとにオーダーカードに書き込み
    Object.keys(datesByMonth).forEach(yearMonth => {
      const dateStringsInMonth = datesByMonth[yearMonth];
      logger.info(`${yearMonth}のオーダーカード処理開始 (${dateStringsInMonth.length}日分)`);
      
      // 該当月のオーダーカードを取得
      const orderCardSpreadsheet = getOrderCardSpreadsheetByYearMonth(yearMonth);
      if (!orderCardSpreadsheet) {
        logger.error(`${yearMonth}のオーダーカードが見つかりませんでした。`);
        return;
      }
      
      logger.info(`オーダーカード: ${orderCardSpreadsheet.getName()}`);
      
      // その月の日付分だけ書き込み
      writeAggregatedOrdersToSpreadsheet(orderCardSpreadsheet, aggregatedOrders, dateStringsInMonth);
    });
    
    logger.info('=== オーダーカード転記処理完了 ===');
    
  } catch (e) {
    handleError(e, 'writeOrdersToOrderCard');
  }
}

/**
 * 日付文字列（YYYY/MM/DD）を月ごとにグループ化
 * @param {Array<string>} dateStrings - YYYY/MM/DD形式の日付文字列の配列
 * @returns {Object} YYYY.MM形式をキーとした日付文字列配列のオブジェクト
 */
function groupDateStringsByMonth(dateStrings) {
  const grouped = {};
  
  dateStrings.forEach(dateStr => {
    // YYYY/MM/DD から YYYY.MM を抽出
    const parts = dateStr.split('/');
    const year = parts[0];
    const month = parts[1];
    const yearMonth = `${year}.${month}`;
    
    if (!grouped[yearMonth]) {
      grouped[yearMonth] = [];
    }
    grouped[yearMonth].push(dateStr);
  });
  
  return grouped;
}

/**
 * 指定された年月のオーダーカードスプレッドシートを取得
 * @param {string} yearMonth - YYYY.MM形式の年月
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet|null} オーダーカードスプレッドシート
 */
function getOrderCardSpreadsheetByYearMonth(yearMonth) {
  const logger = getContextLogger('getOrderCardSpreadsheetByYearMonth');
  
  try {
    const propertyManager = getPropertyManager();
    const orderCardFolderId = propertyManager.getOrderCardFolderId();
    const folder = DriveApp.getFolderById(orderCardFolderId);
    
    // ファイル名パターン: オーダーカード2025.01
    const targetFileName = `オーダーカード${yearMonth}`;
    const files = folder.getFilesByName(targetFileName);
    
    if (!files.hasNext()) {
      logger.error(`ファイル名「${targetFileName}」のオーダーカードが見つかりません。`);
      return null;
    }
    
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
    
  } catch (e) {
    handleError(e, 'getOrderCardSpreadsheetByYearMonth');
    return null;
  }
}

/**
 * 注文を日付×サイズで集計
 * @param {Array} orders - 注文データの配列 (各要素: {date, name, size})
 * @returns {Object} 日付とサイズをキーとした集計結果
 */
function aggregateOrdersByDateAndSize(orders) {
  const aggregated = {};
  
  orders.forEach(order => {
    const dateKey = order.date; // YYYY/MM/DD形式
    const sizeCategory = normalizeSizeCategory(order.size);
    
    if (!aggregated[dateKey]) {
      aggregated[dateKey] = {
        [SIZE_CATEGORIES.LARGE]: 0,
        [SIZE_CATEGORIES.REGULAR]: 0,
        [SIZE_CATEGORIES.SMALL]: 0
      };
    }
    
    // サイズカテゴリに応じてカウント
    aggregated[dateKey][sizeCategory]++;
  });
  
  return aggregated;
}

/**
 * 集計結果をオーダーカードに書き込む
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - オーダーカードスプレッドシート
 * @param {Object} aggregatedOrders - 集計された注文データ
 * @param {Array<string>} dateStrings - YYYY/MM/DD形式の日付文字列配列
 */
function writeAggregatedOrdersToSpreadsheet(spreadsheet, aggregatedOrders, dateStrings) {
  const logger = getContextLogger('writeAggregatedOrdersToSpreadsheet');
  
  try {
    const sheet = spreadsheet.getSheets()[0]; // 最初のシートを使用
    
    // 日付文字列から週番号を計算（何週目か）
    // YYYY/MM/DD を Date に変換
    const firstDateStr = dateStrings[0];
    const firstDate = new Date(firstDateStr);
    const weekNumber = Math.ceil(firstDate.getDate() / 7); // 1〜5週目
    
    logger.info(`書き込み対象: ${weekNumber}週目`);
    
    // 週番号から行番号を計算
    const baseRow = ORDER_CARD_LAYOUT.FIRST_WEEK_BASE_ROW + (weekNumber - 1) * ORDER_CARD_LAYOUT.ROWS_PER_WEEK;
    const rowLarge = baseRow;      // 大盛
    const rowRegular = baseRow + 1; // 普通
    const rowSmall = baseRow + 2;   // 小盛
    
    logger.debug(`書き込み行: 大盛=${rowLarge}, 普通=${rowRegular}, 小盛=${rowSmall}`);
    
    // 各曜日のデータを書き込み
    dateStrings.forEach((dateStr, index) => {
      const orders = aggregatedOrders[dateStr];
      
      if (!orders) {
        logger.debug(`${dateStr}: 注文なし`);
        return;
      }
      
      // dateStrから曜日を計算
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay(); // 0:日, 1:月, ..., 6:土
      
      // 月曜(1)から金曜(5)のみ処理
      if (dayOfWeek < 1 || dayOfWeek > 5) {
        logger.warn(`${dateStr}は平日ではありません (曜日: ${dayOfWeek})`);
        return;
      }
      
      // 列番号を計算（月=D列(4), 火=F列(6), 水=H列(8), 木=J列(10), 金=L列(12)）
      const column = ORDER_CARD_LAYOUT.COLUMN_OFFSET + (dayOfWeek - 1) * ORDER_CARD_LAYOUT.COLUMNS_PER_DAY;
      
      logger.debug(`${dateStr}: ${SIZE_CATEGORIES.LARGE}=${orders[SIZE_CATEGORIES.LARGE]}, ${SIZE_CATEGORIES.REGULAR}=${orders[SIZE_CATEGORIES.REGULAR]}, ${SIZE_CATEGORIES.SMALL}=${orders[SIZE_CATEGORIES.SMALL]} (列${column})`);
      
      // 各サイズの個数を書き込み
      if (orders[SIZE_CATEGORIES.LARGE] > 0) {
        sheet.getRange(rowLarge, column).setValue(orders[SIZE_CATEGORIES.LARGE]);
      }
      if (orders[SIZE_CATEGORIES.REGULAR] > 0) {
        sheet.getRange(rowRegular, column).setValue(orders[SIZE_CATEGORIES.REGULAR]);
      }
      if (orders[SIZE_CATEGORIES.SMALL] > 0) {
        sheet.getRange(rowSmall, column).setValue(orders[SIZE_CATEGORIES.SMALL]);
      }
    });
    
    logger.info(`オーダーカードへの書き込みが完了しました。`);
    
  } catch (e) {
    handleError(e, 'writeAggregatedOrdersToSpreadsheet');
  }
}
