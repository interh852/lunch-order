/**
 * ランチ注文状況を処理し、Slackに通知するメインロジックを提供します。
 */

/**
 * 次週のランチ注文状況をSlackに通知するメイン処理関数
 */
function notifyLunchOrdersToSlack() {
  console.log('ランチ注文状況のSlack通知処理を開始します。');

  try {
    // 1. 次週の日付範囲を取得
    const today = new Date();
    const nextWeekdays = getNextWeekdays(today);
    if (!nextWeekdays || nextWeekdays.length === 0) {
      console.warn('次週の営業日を取得できませんでした。処理を終了します。');
      return;
    }
    console.log(`次週の営業日: ${nextWeekdays.join(', ')}`);

    // 2. 注文データを取得
    const orders = getLunchOrdersForNextWeek(nextWeekdays);
    if (!orders) {
      console.error('注文データの取得に失敗しました。');
      return;
    }
    console.log(`取得した注文データ数: ${orders.length}`);

    // 3. メッセージを整形
    const slackMessage = formatLunchOrdersForSlack(orders);
    if (!slackMessage) {
      console.error('Slackメッセージの整形に失敗しました。');
      return;
    }
    console.log('整形されたSlackメッセージ:\n' + slackMessage);

    // 4. Slackに通知
    const success = sendToSlack(slackMessage);
    if (success) {
      console.log('Slack通知処理が正常に完了しました。');
    } else {
      console.error('Slack通知処理が失敗しました。');
    }

  } catch (e) {
    console.error(`ランチ注文状況のSlack通知処理中にエラーが発生しました: ${e.message}`);
  }
}
