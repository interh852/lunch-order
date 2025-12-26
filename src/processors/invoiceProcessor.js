/**
 * 請求書PDFの保存と解析を行うプロセッサ
 */

/**
 * 請求書メールを処理するメイン関数
 * 1. 請求書メールの検索
 * 2. PDFの解析（保存前）
 * 3. 重複チェックと保存
 * 4. 照合・通知
 */
function processInvoices() {
  const logger = getContextLogger('processInvoices');
  logger.info('請求書処理を開始します...');

  try {
    const config = getConfig();
    if (!config) return;

    // 1. 請求書メールの検索
    const threads = GmailApp.search(config.gmailQueryInvoice);
    
    if (threads.length === 0) {
      logger.info('本日対象となる請求書メールは見つかりませんでした。');
      return;
    }

    const propertyManager = getPropertyManager();
    const invoiceFolderId = propertyManager.getInvoiceFolderId();
    const folder = DriveApp.getFolderById(invoiceFolderId);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    threads.forEach((thread) => {
      const messages = thread.getMessages();
      messages.forEach((message) => {
        // メッセージの日付が古い場合はスキップ
        if (message.getDate() < oneDayAgo) {
          return;
        }

        const attachments = message.getAttachments();
        attachments.forEach((attachment) => {
          if (attachment.getContentType() === MIME_TYPES.PDF) {
            // 2. 保存前にGeminiで解析して対象月を特定
            // attachmentからBlobを生成して解析
            const pdfBlob = attachment.copyBlob();
            const analysisResult = analyzeInvoicePdf(pdfBlob);
            
            if (analysisResult && analysisResult.targetMonth) {
              // 対象月を YYYY/MM から YYYY.MM に変換
              const formattedMonth = analysisResult.targetMonth.replace(/\//g, '.');
              const finalFileName = `invoice.${formattedMonth}.pdf`;
              
              // 3. 重複チェック: 同じ名前のファイルが既に存在するか確認
              const existingFiles = folder.getFilesByName(finalFileName);
              if (existingFiles.hasNext()) {
                logger.info(`請求書「${finalFileName}」は既に存在するため、スキップします。`);
                return;
              }

              // 名前を指定して保存（Blobに名前を設定してから保存）
              pdfBlob.setName(finalFileName);
              const file = folder.createFile(pdfBlob);
              logger.info(`請求書を保存しました: ${finalFileName}`);
              
              // 4. 照合・通知ロジックへ連携
              reconcileAndProcessInvoice(analysisResult, file);
            } else {
              logger.warn(`添付ファイル「${attachment.getName()}」の解析に失敗したため、保存をスキップしました。`);
            }
          }
        });
      });
    });

  } catch (e) {
    handleError(e, 'processInvoices');
  }
}

/**
 * Gemini APIを使用して請求書PDFを解析する
 * @param {GoogleAppsScript.Base.Blob} pdfBlob 請求書PDFのBlob
 * @returns {Object|null} 解析結果（フラットなJSON構造）
 */
function analyzeInvoicePdf(pdfBlob) {
  const logger = getContextLogger('analyzeInvoicePdf');
  const config = getConfig();

  // 汎用関数を使用してPDFを解析
  const analysisResult = parsePdfWithGemini(pdfBlob, config.invoicePrompt, config.modelName);
  
  if (!analysisResult) {
    logger.error('請求書PDFの解析に失敗しました。');
    return null;
  }

  return analysisResult;
}
