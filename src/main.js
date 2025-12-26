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
 * 次回の注文募集アナウンスをSlackに投稿する機能をトリガーから呼び出すための関数
 * 毎週水曜日9時頃に実行し、次回の注文を募集する
 */
function triggerAnnounceNextWeekOrder() {
  announceNextWeekOrderToSlack();
}

/**
 * 次回のランチ注文状況をSlackに通知する機能をトリガーから呼び出すための関数
 */
function triggerNotifyLunchOrdersToSlack() {
  notifyLunchOrdersToSlack();
}

/**
 * 次回の注文内容を集計してオーダーカードに転記し、Gmail下書きを作成する機能をトリガーから呼び出すための関数
 */
function triggerProcessWeeklyOrders() {
  processWeeklyOrdersAndCreateDraft();
}

/**
 * 注文変更を検知してオーダーカードを更新し、通知する機能をトリガーから呼び出すための関数
 * 毎日17時頃に実行し、オーダー送信後の変更を検知する
 */
function triggerDetectOrderChanges() {
  detectOrderChangesAndNotify();
}

/**
 * 請求書メールを処理するトリガー関数
 * 指定された間隔（例: 1日おき）で実行し、請求書の保存・解析・照合を行う
 */
function triggerProcessInvoiceEmails() {
  processInvoices();
}
