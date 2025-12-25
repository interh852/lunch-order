/**
 * 請求書PDFの保存と解析を行うプロセッサ
 */

/**
 * 請求書メールを処理するメイン関数
 * 1. 請求書メールの検索
 * 2. PDFの保存
 * 3. Geminiによる解析
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
      logger.info('該当する請求書メールは見つかりませんでした。');
      return;
    }

    const propertyManager = getPropertyManager();
    const invoiceFolderId = propertyManager.getInvoiceFolderId();
    const folder = DriveApp.getFolderById(invoiceFolderId);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    threads.forEach((thread) => {
      // 処理済みマーク（スター付き）はスキップ
      if (thread.hasStarredMessages()) {
        return;
      }

      const messages = thread.getMessages();
      messages.forEach((message) => {
        // メッセージの日付が古い場合はスキップ（スレッドで取得される過去のメールを除外）
        if (message.getDate() < thirtyDaysAgo) {
          return;
        }

        const attachments = message.getAttachments();
        attachments.forEach((attachment) => {
          if (attachment.getContentType() === MIME_TYPES.PDF) {
            // 2. PDFの保存
            const fileName = attachment.getName();
            logger.info(`請求書PDFを保存します: ${fileName}`);
            const file = folder.createFile(attachment);
            
            // 3. Geminiによる解析
            const analysisResult = analyzeInvoicePdf(file);
            if (analysisResult) {
              logger.info('解析結果:', JSON.stringify(analysisResult));
              // Phase 3 実装済み: 照合・通知ロジックへ連携
              reconcileAndProcessInvoice(analysisResult, file);
            }
          }
        });
      });
      // 処理済みとしてスターを付ける
      thread.addStar();
      logger.info(`スレッド「${thread.getFirstMessageSubject()}」を処理済みにしました。`);
    });

  } catch (e) {
    handleError(e, 'processInvoices');
  }
}

/**
 * Gemini APIを使用して請求書PDFを解析する
 * @param {GoogleAppsScript.Drive.File} file 請求書PDFファイル
 * @returns {Object|null} 解析結果（フラットなJSON構造）
 */
function analyzeInvoicePdf(file) {
  const logger = getContextLogger('analyzeInvoicePdf');
  const config = getConfig();

  try {
    const result = callGeminiApi(config.invoicePrompt, file.getBlob(), config.modelName);
    if (!result) return null;

    // GeminiのレスポンスからJSON部分を抽出してパース
    const responseText = result.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      logger.warn('Geminiからのレスポンスに有効なJSONが含まれていませんでした。', responseText);
      return null;
    }

  } catch (e) {
    logger.error(`PDF解析中にエラーが発生しました: ${file.getName()}`, e.message);
    return null;
  }
}
