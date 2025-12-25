/**
 * 請求書データの集計・照合・通知を行うサービス
 */

/**
 * 請求書の解析結果とシステム上の注文履歴を照合し、結果に応じたアクションを実行する
 * @param {Object} invoiceData Geminiで解析した請求書データ
 * @param {GoogleAppsScript.Drive.File} invoicePdf 請求書PDFファイル
 */
function reconcileAndProcessInvoice(invoiceData, invoicePdf) {
  const logger = getContextLogger('reconcileAndProcessInvoice');
  
  try {
    // 1. 対象月のシステムデータを集計
    const systemData = aggregateOrderHistory(invoiceData.targetMonth);
    if (!systemData) {
      logger.error('システムデータの集計に失敗しました。');
      return;
    }

    logger.info(`照合開始: 対象月 ${invoiceData.targetMonth}`);
    logger.info(`請求書データ: TotalCount=${invoiceData.totalCount}, Amount=${invoiceData.totalAmount}`);
    logger.info(`システムデータ: TotalCount=${systemData.totalCount}, Amount=${systemData.totalAmount}`);

    // 2. データの照合
    const comparisonResult = compareInvoiceAndSystemData(invoiceData, systemData);

    // 3. 結果に応じたアクション
    if (comparisonResult.isMatch) {
      logger.info('✅ 照合OK: 総務部へ申請メールの下書きを作成します。');
      createInvoiceApplicationDraft(invoiceData, invoicePdf);
    } else {
      logger.warn('❌ 照合NG: 差異があります。Slackへ通知します。');
      notifyInvoiceDiscrepancyToSlack(comparisonResult, invoiceData, systemData);
    }

  } catch (e) {
    handleError(e, 'reconcileAndProcessInvoice');
  }
}

/**
 * 指定月の注文履歴を集計する
 * @param {string} targetMonth 対象年月 (YYYY/MM)
 * @returns {Object|null} 集計結果 { countLarge, countRegular, countSmall, totalCount, unitPrice, totalAmount }
 */
function aggregateOrderHistory(targetMonth) {
  const logger = getContextLogger('aggregateOrderHistory');
  const config = getConfig();
  
  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(ORDER_HISTORY_SHEET_NAME);
    if (!sheet) {
      logger.error('注文履歴シートが見つかりません。');
      return null;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < SHEET_DATA_START_ROW) {
      logger.info('注文データがありません。');
      return {
        countLarge: 0,
        countRegular: 0,
        countSmall: 0,
        totalCount: 0,
        unitPrice: 0,
        totalAmount: 0
      };
    }

    // データを一括取得
    const data = sheet.getRange(
      SHEET_DATA_START_ROW, 
      1, 
      lastRow - SHEET_DATA_START_ROW + 1, 
      sheet.getLastColumn()
    ).getValues();

    // 集計用変数
    let countLarge = 0;
    let countRegular = 0;
    let countSmall = 0;

    // targetMonth (YYYY/MM) と一致するデータを集計
    // 日付カラムは D列 (index 3) を想定
    data.forEach(row => {
      const dateVal = row[ORDER_HISTORY_COLUMNS.ORDER_DATE];
      if (!dateVal) return;

      const dateObj = new Date(dateVal);
      const rowMonth = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy/MM');

      if (rowMonth === targetMonth) {
        // サイズカラムは G列 (index 6) を想定
        const sizeStr = row[ORDER_HISTORY_COLUMNS.ORDER_SIZE];
        const category = normalizeSizeCategory(sizeStr);
        
        // 個数カラムは H列 (index 7) を想定。もし空なら1とみなすか、0とみなすか...
        // 既存ロジックに合わせて個数カラムを使用
        const count = Number(row[ORDER_HISTORY_COLUMNS.ORDER_COUNT]) || 1;

        if (category === SIZE_CATEGORIES.LARGE) countLarge += count;
        else if (category === SIZE_CATEGORIES.SMALL) countSmall += count;
        else countRegular += count;
      }
    });

    const totalCount = countLarge + countRegular + countSmall;
    
    // 単価の決定
    let unitPrice = 0;
    if (totalCount >= 14) {
      unitPrice = Number(config.prices.range14Plus);
    } else if (totalCount >= 9) {
      unitPrice = Number(config.prices.range9_13);
    } else if (totalCount >= 1) {
      unitPrice = Number(config.prices.range1_8);
    }

    const totalAmount = totalCount * unitPrice;

    return {
      countLarge,
      countRegular,
      countSmall,
      totalCount,
      unitPrice,
      totalAmount
    };

  } catch (e) {
    handleError(e, 'aggregateOrderHistory');
    return null;
  }
}

/**
 * 請求書データとシステムデータを比較する
 * @param {Object} invoice 請求書データ
 * @param {Object} system システム集計データ
 * @returns {Object} 比較結果 { isMatch: boolean, diffs: Array }
 */
function compareInvoiceAndSystemData(invoice, system) {
  const diffs = [];
  
  if (invoice.totalCount !== system.totalCount) {
    diffs.push(`数量不一致: 請求書=${invoice.totalCount}, システム=${system.totalCount}`);
  }
  
  if (invoice.totalAmount !== system.totalAmount) {
    diffs.push(`金額不一致: 請求書=${invoice.totalAmount}, システム=${system.totalAmount}`);
  }

  // 必要に応じて内訳の比較も追加
  
  return {
    isMatch: diffs.length === 0,
    diffs: diffs
  };
}

/**
 * 総務部への申請メール下書きを作成する
 */
function createInvoiceApplicationDraft(invoiceData, pdfFile) {
  const logger = getContextLogger('createInvoiceApplicationDraft');
  const config = getConfig();

  try {
    const recipient = config.generalAffairs.email;
    const subject = `【お弁当代申請】${invoiceData.targetMonth}分請求書`;
    
    const body = `${config.generalAffairs.name}様\n\n` +
      `お疲れ様です。\n` +
      `${invoiceData.targetMonth}分のお弁当代の請求書を受領しましたので、申請いたします。\n\n` +
      `■請求内容\n` +
      `- 対象月: ${invoiceData.targetMonth}\n` +
      `- 合計個数: ${invoiceData.totalCount}個\n` +
      `- 請求金額: ${invoiceData.totalAmount.toLocaleString()}円\n\n` +
      `請求書PDFを添付しております。\n` +
      `ご確認のほど、よろしくお願いいたします。`;

    GmailApp.createDraft(recipient, subject, body, {
      attachments: [pdfFile.getBlob()]
    });

    logger.info(`Gmail下書きを作成しました: ${subject}`);

  } catch (e) {
    handleError(e, 'createInvoiceApplicationDraft');
  }
}

/**
 * 差異をSlackに通知する
 */
function notifyInvoiceDiscrepancyToSlack(comparison, invoice, system) {
  const logger = getContextLogger('notifyInvoiceDiscrepancyToSlack');
  const config = getConfig();

  try {
    const message = `⚠️ *請求書の金額不一致を検知しました*\n\n` +
      `請求書の内容と、注文履歴の集計結果が一致しませんでした。\n` +
      `確認をお願いします。\n\n` +
      `*■ 差異の内容*\n` +
      comparison.diffs.map(diff => `• ${diff}`).join('\n') + `\n\n` +
      `*■ 請求書データ*\n` +
      `対象月: ${invoice.targetMonth}\n` +
      `個数: ${invoice.totalCount}個\n` +
      `金額: ${invoice.totalAmount.toLocaleString()}円\n\n` +
      `*■ システム集計データ*\n` +
      `個数: ${system.totalCount}個\n` +
      `金額: ${system.totalAmount.toLocaleString()}円`;

    logger.debug(`Slack通知送信: チャンネルID=${config.slack.channelId}`);
    // sendToSlack(message, channelId) のシグネチャに合わせて呼び出し
    // トークンはsendToSlack内部でconfigから取得される
    sendToSlack(message, config.slack.channelId);
    logger.info('Slackに不一致通知を送信しました。');

  } catch (e) {
    handleError(e, 'notifyInvoiceDiscrepancyToSlack');
  }
}
