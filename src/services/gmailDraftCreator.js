/**
 * Gmail下書き作成機能
 */

/**
 * 注文メールの下書きを作成
 * @param {string} recipientEmail - 宛先メールアドレス
 * @param {Object} period - 期間情報 {start: string, end: string}
 * @param {Object} changes - 変更情報
 * @param {Array<GoogleAppsScript.Base.Blob>} attachments - 添付ファイル（Excelのblob配列）
 * @returns {GoogleAppsScript.Gmail.GmailDraft|null} 作成された下書き
 */
function createOrderEmailDraft(recipientEmail, period, changes, attachments) {
  const logger = getContextLogger('createOrderEmailDraft');
  
  try {
    // 件名を生成
    const subject = generateEmailSubject(period);
    
    // 本文を生成
    const body = generateEmailBody(recipientEmail, changes, period);
    
    // 送信者名（情報シートのB8セルから取得）
    const senderName = getSenderNameFromPromptSheet() || extractNameFromEmail(Session.getActiveUser().getEmail());
    
    logger.info(`メール下書き作成: 宛先=${recipientEmail}, 件名=${subject}`);
    logger.debug(`添付ファイル数: ${attachments ? attachments.length : 0}`);
    
    // 下書きを作成（常に新規メールとして作成）
    const draftOptions = {
      attachments: attachments || [],
      name: senderName  // 送信者名を日本語で設定
    };
    
    const draft = GmailApp.createDraft(
      recipientEmail,
      subject,
      body,
      draftOptions
    );
    
    logger.info('Gmail下書きを作成しました。');
    
    return draft;
    
  } catch (e) {
    handleError(e, 'createOrderEmailDraft');
    return null;
  }
}

/**
 * メールの件名を生成
 * @param {Object} period - 期間情報 {start: string, end: string}
 * @returns {string} 件名
 */
function generateEmailSubject(period) {
  const startDate = new Date(period.start);
  const endDate = new Date(period.end);
  
  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();
  
  // 例: 12/09~12/12のお弁当について
  return `${startMonth}/${String(startDay).padStart(2, '0')}~${endMonth}/${String(endDay).padStart(2, '0')}${EMAIL_TEMPLATES.SUBJECT_PREFIX}`;
}

/**
 * メール本文を生成
 * @param {string} recipientEmail - 宛先メールアドレス
 * @param {Object} changes - 変更情報
 * @param {Object} period - 期間情報
 * @returns {string} メール本文
 */
function generateEmailBody(recipientEmail, changes, period) {
  const lines = [];
  
  // 宛名（次週の注文データから店名を取得）
  const storeName = getStoreNameFromNextWeekOrders() || extractNameFromEmail(recipientEmail);
  lines.push(`${storeName}${EMAIL_TEMPLATES.GREETING}`);
  
  // 送信者名（情報シートのB8セルから取得）
  const senderName = getSenderNameFromPromptSheet() || extractNameFromEmail(Session.getActiveUser().getEmail());
  lines.push(`${senderName}です。`);
  lines.push('');
  lines.push(EMAIL_TEMPLATES.BODY_MAIN);
  lines.push('');
  
  // 変更があれば記載
  const changeText = formatOrderChanges(changes);
  if (changeText) {
    lines.push('【数量変更】');
    lines.push(changeText);
    lines.push('');
  }
  
  lines.push(EMAIL_TEMPLATES.CLOSING);
  
  return lines.join('\n');
}

/**
 * メールアドレスから名前を抽出
 * @param {string} email - メールアドレス
 * @returns {string} 名前部分（または様付きメールアドレス）
 */
function extractNameFromEmail(email) {
  // @の前の部分を取得
  const namePart = email.split('@')[0];
  return namePart || email;
}

/**
 * 次週の注文データから店名を取得
 * @returns {string} 店名（取得できない場合は空文字列）
 */
function getStoreNameFromNextWeekOrders() {
  const logger = getContextLogger('getStoreNameFromNextWeekOrders');
  
  try {
    const propertyManager = getPropertyManager();
    const spreadsheetId = propertyManager.getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(ORDER_HISTORY_SHEET_NAME);
    
    if (!sheet) {
      logger.error(`シート「${ORDER_HISTORY_SHEET_NAME}」が見つかりません。`);
      return '';
    }
    
    // 次週の平日を取得
    const nextWeekdays = getNextWeekdays(new Date());
    
    if (nextWeekdays.length === 0) {
      logger.warn('次週の平日が取得できませんでした。');
      return '';
    }
    
    // 2行目以降のデータを取得（ヘッダーを除く）
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      logger.warn('注文履歴が空です。');
      return '';
    }
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    // 次週の注文データから店名を検索
    for (const targetDateStr of nextWeekdays) {
      for (const row of values) {
        const orderDate = row[ORDER_HISTORY_COLUMNS.ORDER_DATE];
        if (orderDate instanceof Date) {
          const orderDateStr = Utilities.formatDate(orderDate, Session.getScriptTimeZone(), DATE_FORMATS.YYYY_MM_DD_SLASH);
          if (orderDateStr === targetDateStr) {
            const storeName = row[ORDER_HISTORY_COLUMNS.STORE_NAME];
            if (storeName) {
              logger.debug(`店名を取得しました: ${storeName}`);
              return storeName;
            }
          }
        }
      }
    }
    
    logger.warn('次週の注文データに店名が見つかりませんでした。');
    return '';
    
  } catch (e) {
    handleError(e, 'getStoreNameFromNextWeekOrders');
    return '';
  }
}

/**
 * 情報シートの B8 セルから送信者名を取得
 * @returns {string} 送信者名（取得できない場合は空文字列）
 */
function getSenderNameFromPromptSheet() {
  const logger = getContextLogger('getSenderNameFromPromptSheet');
  
  try {
    const propertyManager = getPropertyManager();
    const spreadsheetId = propertyManager.getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(PROMPT_SHEET_NAME);
    
    if (!sheet) {
      logger.error(`シート「${PROMPT_SHEET_NAME}」が見つかりません。`);
      return '';
    }
    
    // B8セルから送信者名を取得
    const senderName = sheet.getRange(SENDER_NAME_CELL).getValue();
    
    if (!senderName) {
      logger.warn('B8セルに送信者名が設定されていません。');
      return '';
    }
    
    logger.debug(`送信者名を取得しました: ${senderName}`);
    return senderName;
    
  } catch (e) {
    handleError(e, 'getSenderNameFromPromptSheet');
    return '';
  }
}

/**
 * 前回の注文メールスレッドを検索
 * @param {string} recipientEmail - 宛先メールアドレス
 * @returns {GoogleAppsScript.Gmail.GmailThread|null} 見つかったスレッド
 */
function findPreviousOrderEmailThread(recipientEmail) {
  const logger = getContextLogger('findPreviousOrderEmailThread');
  
  try {
    // 件名のパターン（「のお弁当について」で検索）
    const searchQuery = `to:${recipientEmail} subject:${EMAIL_TEMPLATES.SUBJECT_PREFIX}`;
    logger.debug(`検索クエリ: ${searchQuery}`);
    
    // 最新の1件を取得
    const threads = GmailApp.search(searchQuery, 0, 1);
    
    if (threads.length > 0) {
      return threads[0];
    }
    
    logger.warn('前回の注文メールスレッドが見つかりませんでした。');
    return null;
    
  } catch (e) {
    handleError(e, 'findPreviousOrderEmailThread');
    return null;
  }
}

/**
 * 全ての前回値が0（新規発注）かチェック
 * @param {Object} changes - 変更情報
 * @returns {boolean} 全て0ならtrue
 */
function isAllPreviousValuesZero(changes) {
  let hasNonZeroPrevious = false;
  
  Object.keys(changes).forEach(yearMonth => {
    const monthChanges = changes[yearMonth];
    Object.keys(monthChanges).forEach(dateStr => {
      const dateChanges = monthChanges[dateStr];
      Object.keys(dateChanges).forEach(size => {
        if (dateChanges[size].previous > 0) {
          hasNonZeroPrevious = true;
        }
      });
    });
  });
  
  return !hasNonZeroPrevious;
}

/**
 * 注文数の変更をメール用にフォーマット
 * @param {Object} changes - 変更情報
 * @returns {string} フォーマットされた変更内容（新規発注の場合は空文字列）
 */
function formatOrderChanges(changes) {
  const lines = [];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  
  // 全ての月の変更をマージ
  const allDateChanges = {};
  Object.keys(changes).forEach(yearMonth => {
    const monthChanges = changes[yearMonth];
    Object.keys(monthChanges).forEach(dateStr => {
      allDateChanges[dateStr] = monthChanges[dateStr];
    });
  });
  
  // 全て新規発注なら変更履歴は表示しない
  if (isAllPreviousValuesZero(changes)) {
    return '';
  }
  
  // 日付でソート
  const sortedDates = Object.keys(allDateChanges).sort();
  
  sortedDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = dayNames[date.getDay()];
    const formatted = `${month}/${day}(${dayOfWeek})`;
    
    const dateChanges = allDateChanges[dateStr];
    
    Object.keys(dateChanges).forEach(size => {
      const change = dateChanges[size];
      lines.push(`${formatted} ${size}${change.previous}個 → ${change.current}個`);
    });
  });
  
  return lines.join('\n');
}
