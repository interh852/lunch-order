/**
 * Gmailの添付ファイルを処理するための汎用サービス
 */

/**
 * 指定された条件でGmailの添付ファイルを検索し、処理する汎用関数
 * @param {Object} options - 処理オプション
 * @param {string} options.query - Gmail検索クエリ
 * @param {number} [options.daysToSearch=1] - 検索対象とする期間（日数）。デフォルトは1日。
 * @param {Function} options.processAttachment - 添付ファイルごとの処理を行うコールバック関数
 *   引数: (attachment: GoogleAppsScript.Gmail.GmailAttachment, message: GoogleAppsScript.Gmail.GmailMessage)
 *   戻り値: void
 */
function processGmailAttachments(options) {
  const logger = getContextLogger('processGmailAttachments');
  const { query, daysToSearch = 1, processAttachment } = options;

  if (!query) {
    logger.error('検索クエリが指定されていません。');
    return;
  }

  if (!processAttachment || typeof processAttachment !== 'function') {
    logger.error('処理用のコールバック関数が指定されていません。');
    return;
  }

  try {
    // メール検索
    const threads = GmailApp.search(query);
    if (threads.length === 0) {
      logger.info(`条件に一致するメールは見つかりませんでした。(Query: ${query})`);
      return;
    }

    // 期間フィルタリング用の日時
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - daysToSearch * 24 * 60 * 60 * 1000);

    let processedCount = 0;

    threads.forEach((thread) => {
      const messages = thread.getMessages();

      messages.forEach((message) => {
        // 日付フィルタリング
        if (message.getDate() < thresholdDate) {
          return;
        }

        const attachments = message.getAttachments();
        attachments.forEach((attachment) => {
          try {
            processAttachment(attachment, message);
            processedCount++;
          } catch (e) {
            logger.error(`添付ファイルの処理中にエラーが発生しました: ${attachment.getName()}`, e.message);
          }
        });
      });
    });

    logger.info(`${processedCount}件の添付ファイルを処理しました。`);

  } catch (e) {
    handleError(e, 'processGmailAttachments');
  }
}
