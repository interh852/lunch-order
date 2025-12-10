/**
 * 週次注文処理プロセッサー
 * 次週の注文内容を集計してオーダーカードに転記し、Gmail下書きを作成する
 */

/**
 * 次週の注文内容を集計してオーダーカードに転記し、Gmail下書きを作成する
 */
function processWeeklyOrdersAndCreateDraft() {
  const logger = getContextLogger('processWeeklyOrdersAndCreateDraft');
  
  try {
    // 1. オーダーカードに転記（差分も取得）
    const result = writeOrdersToOrderCard();
    
    if (!result.hasOrders) {
      logger.warn('注文データがないため、メール下書きは作成しません。');
      return;
    }
    
    // スプレッドシートへの書き込みを確実に反映させる
    SpreadsheetApp.flush();
    logger.info('スプレッドシートへの書き込みを完了しました。');
    
    // 2. 弁当屋さんのメールアドレスを取得
    const propertyManager = getPropertyManager();
    const bentoMailAddress = propertyManager.getBentoMailAddress();
    
    if (!bentoMailAddress) {
      logger.error('BENTO_MAIL_ADDRESSが設定されていません。メール下書きの作成をスキップします。');
      return;
    }
    
    // 3. オーダーカードをExcel形式でエクスポート
    const excelAttachments = exportMultipleSpreadsheetsAsExcel(result.orderCardFiles);
    
    if (!excelAttachments || excelAttachments.length === 0) {
      logger.error('オーダーカードのエクスポートに失敗しました。');
      return;
    }
    
    // 4. Gmail下書きを作成
    const draft = createOrderEmailDraft(
      bentoMailAddress,
      result.period,
      result.changes,
      excelAttachments
    );
    
    if (draft) {
      logger.info('Gmail下書きの作成が完了しました。');
    } else {
      logger.error('Gmail下書きの作成に失敗しました。');
    }
    
  } catch (e) {
    handleError(e, 'processWeeklyOrdersAndCreateDraft');
  }
}

/**
 * 次週の注文内容を集計してオーダーカードに転記する
 * オーダーカードフォルダから最新のスプレッドシートを取得し、
 * 注文履歴から次週分の注文を日付×サイズで集計して書き込みます
 * @returns {Object} 変更情報（差分データ）を含むオブジェクト
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
      return { hasOrders: false, changes: {}, period: { start: nextWeekdays[0], end: nextWeekdays[nextWeekdays.length - 1] } };
    }
    
    // 3. 日付×サイズごとに集計
    const aggregatedOrders = aggregateOrdersByDateAndSize(orders);
    logger.debug('集計結果:', JSON.stringify(aggregatedOrders, null, 2));
    
    // 4. 次週の日付文字列を月ごとにグループ化
    const datesByMonth = groupDateStringsByMonth(nextWeekdays);
    logger.info(`対象月数: ${Object.keys(datesByMonth).length}ヶ月`);
    
    // 5. 月ごとにオーダーカードに書き込み（差分も記録）
    const allChanges = {};
    const orderCardFiles = {};
    
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
      
      // その月の日付分だけ書き込み（差分も取得）
      const changes = writeAggregatedOrdersToSpreadsheet(orderCardSpreadsheet, aggregatedOrders, dateStringsInMonth);
      allChanges[yearMonth] = changes;
      orderCardFiles[yearMonth] = orderCardSpreadsheet;
    });
    
    logger.info('=== オーダーカード転記処理完了 ===');
    
    return {
      hasOrders: true,
      changes: allChanges,
      period: {
        start: nextWeekdays[0],
        end: nextWeekdays[nextWeekdays.length - 1]
      },
      orderCardFiles: orderCardFiles
    };
    
  } catch (e) {
    handleError(e, 'writeOrdersToOrderCard');
    return { hasOrders: false, changes: {}, period: {}, error: e.message };
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
 * @returns {Object} 変更情報（前回値と現在値の差分）
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
    
    // 書き込み前に前回の値を読み取る
    const previousValues = readPreviousOrderValues(sheet, weekNumber, dateStrings);
    
    // 書き込み前に対象週の全セルをクリア（月〜金の5日分）
    const startColumn = ORDER_CARD_LAYOUT.COLUMN_OFFSET; // D列
    const numDays = 5; // 月〜金
    const numColumns = numDays * ORDER_CARD_LAYOUT.COLUMNS_PER_DAY;
    
    // 大盛、普通、小盛の3行をクリア
    sheet.getRange(rowLarge, startColumn, 1, numColumns).clearContent();
    sheet.getRange(rowRegular, startColumn, 1, numColumns).clearContent();
    sheet.getRange(rowSmall, startColumn, 1, numColumns).clearContent();
    
    logger.debug(`${weekNumber}週目のセルをクリアしました (行: ${rowLarge}-${rowSmall}, 列: ${startColumn}-${startColumn + numColumns - 1})`);
    
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
    
    // 差分を計算
    const changes = calculateOrderChanges(previousValues, aggregatedOrders, dateStrings);
    
    return changes;
    
  } catch (e) {
    handleError(e, 'writeAggregatedOrdersToSpreadsheet');
    return {};
  }
}

/**
 * オーダーカードから前回の注文数を読み取る
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - オーダーカードのシート
 * @param {number} weekNumber - 週番号（1〜5）
 * @param {Array<string>} dateStrings - YYYY/MM/DD形式の日付文字列配列
 * @returns {Object} 日付ごとの前回注文数
 */
function readPreviousOrderValues(sheet, weekNumber, dateStrings) {
  const logger = getContextLogger('readPreviousOrderValues');
  const previousValues = {};
  const baseRow = ORDER_CARD_LAYOUT.FIRST_WEEK_BASE_ROW + (weekNumber - 1) * ORDER_CARD_LAYOUT.ROWS_PER_WEEK;
  
  dateStrings.forEach(dateStr => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek < 1 || dayOfWeek > 5) return; // 平日以外はスキップ
    
    const column = ORDER_CARD_LAYOUT.COLUMN_OFFSET + (dayOfWeek - 1) * ORDER_CARD_LAYOUT.COLUMNS_PER_DAY;
    
    previousValues[dateStr] = {
      [SIZE_CATEGORIES.LARGE]: sheet.getRange(baseRow, column).getValue() || 0,
      [SIZE_CATEGORIES.REGULAR]: sheet.getRange(baseRow + 1, column).getValue() || 0,
      [SIZE_CATEGORIES.SMALL]: sheet.getRange(baseRow + 2, column).getValue() || 0
    };
  });
  
  logger.debug('前回値読み取り完了:', JSON.stringify(previousValues, null, 2));
  return previousValues;
}

/**
 * 注文数の変更を計算
 * @param {Object} previousValues - 前回の注文数
 * @param {Object} currentOrders - 現在の注文数
 * @param {Array<string>} dateStrings - 対象日付の配列
 * @returns {Object} 変更情報
 */
function calculateOrderChanges(previousValues, currentOrders, dateStrings) {
  const logger = getContextLogger('calculateOrderChanges');
  const changes = {};
  
  dateStrings.forEach(dateStr => {
    const prev = previousValues[dateStr] || {
      [SIZE_CATEGORIES.LARGE]: 0,
      [SIZE_CATEGORIES.REGULAR]: 0,
      [SIZE_CATEGORIES.SMALL]: 0
    };
    const curr = currentOrders[dateStr] || {
      [SIZE_CATEGORIES.LARGE]: 0,
      [SIZE_CATEGORIES.REGULAR]: 0,
      [SIZE_CATEGORIES.SMALL]: 0
    };
    
    const dateChanges = {};
    let hasChange = false;
    
    [SIZE_CATEGORIES.LARGE, SIZE_CATEGORIES.REGULAR, SIZE_CATEGORIES.SMALL].forEach(size => {
      const prevVal = prev[size] || 0;
      const currVal = curr[size] || 0;
      
      if (prevVal !== currVal) {
        dateChanges[size] = {
          previous: prevVal,
          current: currVal,
          diff: currVal - prevVal
        };
        hasChange = true;
      }
    });
    
    if (hasChange) {
      changes[dateStr] = dateChanges;
    }
  });
  
  logger.debug('差分計算完了:', JSON.stringify(changes, null, 2));
  return changes;
}
