/**
 * Gmailの添付ファイルを保存する機能をトリガーから呼び出すための関数
 */
function triggerSaveAttachments() {
  saveGmailAttachmentsToDrive();
}

/**
 * PDFメニューの処理機能をトリガーから呼び出すための関数
 */
function triggerProcessPdfMenus() {
  processPdfMenuFiles();
}

/**
 * 次週のランチ注文状況をSlackに通知する機能をトリガーから呼び出すための関数
 */
function triggerNotifyLunchOrdersToSlack() {
  notifyLunchOrdersToSlack();
}
