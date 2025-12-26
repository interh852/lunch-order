/**
 * Gmail下書き作成機能
 */

// ==========================================
// メイン関数（公開API）
// ==========================================

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
    const senderName =
      getSenderNameFromPromptSheet() || extractNameFromEmail(Session.getActiveUser().getEmail());

    logger.info(`メール下書き作成: 宛先=${recipientEmail}, 件名=${subject}`);
    logger.debug(`添付ファイル数: ${attachments ? attachments.length : 0}`);

    // 下書きを作成（常に新規メールとして作成）
    const draftOptions = {
      attachments: attachments || [],
      name: senderName, // 送信者名を日本語で設定
    };

    const draft = GmailApp.createDraft(recipientEmail, subject, body, draftOptions);

    logger.info('Gmail下書きを作成しました。');

    return draft;
  } catch (e) {
    handleError(e, 'createOrderEmailDraft');
    return null;
  }
}

/**
 * 注文変更用のメール下書きを作成
 * @param {string} recipientEmail - 宛先メールアドレス
 * @param {Object} period - 期間情報 {start: string, end: string}
 * @param {Object} changes - 変更情報 {added: [], cancelled: []}
 * @param {Array<GoogleAppsScript.Base.Blob>} attachments - 添付ファイル（Excelのblob配列）
 * @param {string} weekType - 'current' or 'next'
 * @returns {GoogleAppsScript.Gmail.GmailDraft|null} 作成された下書き
 */
function createOrderChangeEmailDraft(recipientEmail, period, changes, attachments, weekType) {
  const logger = getContextLogger('createOrderChangeEmailDraft');

  try {
    // 件名を生成（【変更】を追加）
    const subject = generateChangeEmailSubject(period);

    // 本文を生成
    const body = generateChangeEmailBody(recipientEmail, changes, period, weekType);

    // 送信者名を取得
    const senderName =
      getSenderNameFromPromptSheet() || extractNameFromEmail(Session.getActiveUser().getEmail());

    logger.info(`変更通知メール下書き作成: 宛先=${recipientEmail}, 件名=${subject}`);
    logger.debug(`添付ファイル数: ${attachments ? attachments.length : 0}`);

    // 下書きを作成
    const draftOptions = {
      attachments: attachments || [],
      name: senderName,
    };

    const draft = GmailApp.createDraft(recipientEmail, subject, body, draftOptions);

    logger.info('変更通知メール下書きを作成しました。');

    return draft;
  } catch (e) {
    handleError(e, 'createOrderChangeEmailDraft');
    return null;
  }
}

/**
 * 請求書申請用のメール下書きを作成
 * @param {string} recipientEmail - 宛先メールアドレス
 * @param {Object} invoiceData - 請求書データ {targetMonth, totalCount, totalAmount}
 * @param {GoogleAppsScript.Base.Blob} pdfBlob - 請求書PDFのBlob
 * @param {string} recipientName - 宛先担当者名
 * @returns {GoogleAppsScript.Gmail.GmailDraft|null} 作成された下書き
 */
function createInvoiceEmailDraft(recipientEmail, invoiceData, pdfBlob, recipientName) {
  const logger = getContextLogger('createInvoiceEmailDraft');

  try {
    // 件名を生成
    const subject = `【お弁当代申請】${invoiceData.targetMonth}分請求書`;

    // 送信者名を取得
    const senderName =
      getSenderNameFromPromptSheet() || extractNameFromEmail(Session.getActiveUser().getEmail());

    // 本文を生成
    const body = `${recipientName}さん\n\n` +
      `お疲れ様です。\n` +
      `${senderName}です。\n\n` +
      `${invoiceData.targetMonth}分のお弁当代の請求書を受領しましたので、申請いたします。\n\n` +
      `■請求内容\n` +
      `- 対象月: ${invoiceData.targetMonth}\n` +
      `- 合計個数: ${invoiceData.totalCount}個\n` +
      `- 請求金額: ${invoiceData.totalAmount.toLocaleString()}円\n\n` +
      `請求書PDFを添付しております。\n` +
      `ご確認のほど、よろしくお願いいたします。`;

    logger.info(`請求書申請メール下書き作成: 宛先=${recipientEmail}, 件名=${subject}`);

    // 下書きを作成
    const draftOptions = {
      attachments: [pdfBlob],
      name: senderName,
    };

    const draft = GmailApp.createDraft(recipientEmail, subject, body, draftOptions);

    logger.info('請求書申請メール下書きを作成しました。');

    return draft;
  } catch (e) {
    handleError(e, 'createInvoiceEmailDraft');
    return null;
  }
}

// ==========================================
// ヘルパー関数（内部実装）
// ==========================================

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

  // 宛名（次回の注文データから店名を取得）
  const storeName = getStoreNameFromNextWeekOrders() || extractNameFromEmail(recipientEmail);
  lines.push(`${storeName}${EMAIL_TEMPLATES.GREETING}`);

  // 送信者名（情報シートのB8セルから取得）
  const senderName =
    getSenderNameFromPromptSheet() || extractNameFromEmail(Session.getActiveUser().getEmail());
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
 * 指定された日付リストの注文データから店名を取得
 * @param {Array<string>} dateStrings - 日付文字列の配列 (YYYY/MM/DD形式)
 * @returns {string} 店名（取得できない場合は空文字列）
 */
function getStoreNameFromOrders(dateStrings) {
  const logger = getContextLogger('getStoreNameFromOrders');

  try {
    if (!dateStrings || dateStrings.length === 0) {
      logger.warn('日付リストが空です。');
      return '';
    }

    const propertyManager = getPropertyManager();
    const spreadsheetId = propertyManager.getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(ORDER_HISTORY_SHEET_NAME);

    if (!sheet) {
      logger.error(`シート「${ORDER_HISTORY_SHEET_NAME}」が見つかりません。`);
      return '';
    }

    // 2行目以降のデータを取得（ヘッダーを除く）
    const lastRow = sheet.getLastRow();
    if (lastRow < SHEET_DATA_START_ROW) {
      logger.warn('注文履歴が空です。');
      return '';
    }

    const dataRange = sheet.getRange(
      SHEET_DATA_START_ROW,
      1,
      lastRow - SHEET_HEADER_ROW,
      sheet.getLastColumn()
    );
    const values = dataRange.getValues();

    // 日付リストをSetに変換（高速検索用）
    const dateSet = new Set(dateStrings);

    // 指定日付の注文データから店名を検索
    for (const row of values) {
      const orderDate = row[ORDER_HISTORY_COLUMNS.ORDER_DATE];
      if (orderDate instanceof Date) {
        const orderDateStr = Utilities.formatDate(
          orderDate,
          Session.getScriptTimeZone(),
          DATE_FORMATS.YYYY_MM_DD_SLASH
        );
        if (dateSet.has(orderDateStr)) {
          const storeName = row[ORDER_HISTORY_COLUMNS.STORE_NAME];
          if (storeName) {
            logger.debug(`店名を取得しました: ${storeName} (${orderDateStr})`);
            return storeName;
          }
        }
      }
    }

    logger.warn(`指定日付の注文データに店名が見つかりませんでした。`);
    return '';
  } catch (e) {
    handleError(e, 'getStoreNameFromOrders');
    return '';
  }
}

/**
 * 次回の注文データから店名を取得
 * @returns {string} 店名（取得できない場合は空文字列）
 */
function getStoreNameFromNextWeekOrders() {
  const nextWeekdays = getNextWeekdays(new Date());
  return getStoreNameFromOrders(nextWeekdays);
}

/**
 * 指定期間の注文データから店名を取得
 * @param {Object} period - 期間情報 {start: string, end: string}
 * @returns {string} 店名（取得できない場合は空文字列）
 */
function getStoreNameFromPeriod(period) {
  // 期間内のすべての平日を取得
  const dateStrings = getWeekdaysInRange(period.start, period.end);
  return getStoreNameFromOrders(dateStrings);
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
      logger.warn(`${SENDER_NAME_CELL}セルに送信者名が設定されていません。`);
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

  Object.keys(changes).forEach((yearMonth) => {
    const monthChanges = changes[yearMonth];
    Object.keys(monthChanges).forEach((dateStr) => {
      const dateChanges = monthChanges[dateStr];
      Object.keys(dateChanges).forEach((size) => {
        if (dateChanges[size].previous > 0) {
          hasNonZeroPrevious = true;
        }
      });
    });
  });

  return !hasNonZeroPrevious;
}

/**
 * 変更通知メールの件名を生成
 * @param {Object} period - 期間情報 {start: string, end: string}
 * @returns {string} 件名
 */
function generateChangeEmailSubject(period) {
  const startDate = new Date(period.start);
  const endDate = new Date(period.end);

  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();

  // 例: 【変更】12/16~12/20のお弁当について
  return `【変更】${startMonth}/${String(startDay).padStart(2, '0')}~${endMonth}/${String(endDay).padStart(2, '0')}${EMAIL_TEMPLATES.SUBJECT_PREFIX}`;
}

/**
 * 変更通知メールの本文を生成
 * @param {string} recipientEmail - 宛先メールアドレス
 * @param {Object} changes - 変更情報 {added: [], cancelled: []}
 * @param {Object} period - 期間情報
 * @param {string} weekType - 'current' or 'next'
 * @returns {string} メール本文
 */
function generateChangeEmailBody(recipientEmail, changes, period, weekType) {
  const lines = [];

  // 宛名（期間の注文データから店名を取得）
  const storeName = getStoreNameFromPeriod(period) || extractNameFromEmail(recipientEmail);
  lines.push(`${storeName}${EMAIL_TEMPLATES.GREETING}`);

  // 送信者名
  const senderName =
    getSenderNameFromPromptSheet() || extractNameFromEmail(Session.getActiveUser().getEmail());
  lines.push(`${senderName}です。`);
  lines.push('');

  // 本文
  const weekLabel = weekType === 'current' ? '今週' : '次回';
  lines.push(`${weekLabel}のお弁当注文について、変更がありましたのでご連絡いたします。`);
  lines.push('');

  // 変更内容を整形
  const changeText = formatChangesForEmail(changes);
  if (changeText) {
    lines.push('【変更内容】');
    lines.push(changeText);
    lines.push('');
  }

  lines.push('更新後のオーダーカードを添付いたしますので、');
  lines.push('ご確認の程よろしくお願いいたします。');
  lines.push('');
  lines.push(EMAIL_TEMPLATES.CLOSING);

  return lines.join('\n');
}

/**
 * 変更内容をメール本文用に整形
 * 日付とサイズごとに「変更前→変更後」の形式で表示
 * @param {Object} changes - { added: [], cancelled: [], quantityChanges: [] }
 * @returns {string} 整形された変更内容
 */
function formatChangesForEmail(changes) {
  const lines = [];

  // quantityChangesが存在すればそれを使用
  if (changes.quantityChanges && changes.quantityChanges.length > 0) {
    // 日付順にソート
    const sorted = changes.quantityChanges.sort((a, b) => {
      return a.date.localeCompare(b.date);
    });

    sorted.forEach((item) => {
      const formattedDate = formatJapaneseDateWithDay(item.date);
      lines.push(`${formattedDate} ${item.size} ${item.before}個 → ${item.after}個`);
    });
  } else {
    // quantityChangesがない場合は従来の形式（後方互換性のため）
    const summary = {};

    // キャンセルをカウント
    if (changes.cancelled && changes.cancelled.length > 0) {
      changes.cancelled.forEach((change) => {
        const key = `${change.date}_${change.size}`;
        if (!summary[key]) {
          summary[key] = { date: change.date, size: change.size, added: 0, cancelled: 0 };
        }
        summary[key].cancelled += 1;
      });
    }

    // 追加をカウント
    if (changes.added && changes.added.length > 0) {
      changes.added.forEach((change) => {
        const key = `${change.date}_${change.size}`;
        if (!summary[key]) {
          summary[key] = { date: change.date, size: change.size, added: 0, cancelled: 0 };
        }
        summary[key].added += 1;
      });
    }

    // 日付順にソート
    const sortedKeys = Object.keys(summary).sort((a, b) => {
      const dateA = summary[a].date;
      const dateB = summary[b].date;
      return dateA.localeCompare(dateB);
    });

    // フォーマットして出力
    sortedKeys.forEach((key) => {
      const item = summary[key];
      const formattedDate = formatJapaneseDateWithDay(item.date);

      const parts = [];
      if (item.added > 0) {
        parts.push(`追加${item.added}件`);
      }
      if (item.cancelled > 0) {
        parts.push(`キャンセル${item.cancelled}件`);
      }

      lines.push(`${formattedDate} ${item.size} ${parts.join('、')}`);
    });
  }

  return lines.join('\n');
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
  Object.keys(changes).forEach((yearMonth) => {
    const monthChanges = changes[yearMonth];
    Object.keys(monthChanges).forEach((dateStr) => {
      allDateChanges[dateStr] = monthChanges[dateStr];
    });
  });

  // 全て新規発注なら変更履歴は表示しない
  if (isAllPreviousValuesZero(changes)) {
    return '';
  }

  // 日付でソート
  const sortedDates = Object.keys(allDateChanges).sort();

  sortedDates.forEach((dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = dayNames[date.getDay()];
    const formatted = `${month}/${day}(${dayOfWeek})`;

    const dateChanges = allDateChanges[dateStr];

    Object.keys(dateChanges).forEach((size) => {
      const change = dateChanges[size];
      lines.push(`${formatted} ${size}${change.previous}個 → ${change.current}個`);
    });
  });

  return lines.join('\n');
}
