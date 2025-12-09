/**
 * ランチ注文状況を処理し、Slackに通知するメインロジックを提供します。
 */

/**
 * 次週のランチ注文状況をSlackに通知するメイン処理関数
 */
function notifyLunchOrdersToSlack() {
  const logger = getContextLogger('notifyLunchOrdersToSlack');
  logger.info('ランチ注文状況のSlack通知処理を開始します。');

  try {
    // 1. 次週の日付範囲を取得
    const today = new Date();
    const nextWeekdays = getNextWeekdays(today);
    if (!nextWeekdays || nextWeekdays.length === 0) {
      logger.warn('次週の営業日を取得できませんでした。処理を終了します。');
      return;
    }
    logger.info(`次週の営業日: ${nextWeekdays.join(', ')}`);

    // 2. 注文データを取得
    const orders = getLunchOrdersForNextWeek(nextWeekdays);
    if (!orders) {
      logger.error('注文データの取得に失敗しました。');
      return;
    }
    logger.info(`取得した注文データ数: ${orders.length}`);

    // 3. メッセージを整形
    const slackMessage = formatLunchOrdersForSlack(orders);
    if (!slackMessage) {
      logger.error('Slackメッセージの整形に失敗しました。');
      return;
    }
    logger.debug('整形されたSlackメッセージ:\n' + slackMessage);

    // 4. Slackに通知
    const slackResult = sendToSlack(slackMessage);
    if (Result.isSuccess(slackResult)) {
      logger.info('Slack通知処理が正常に完了しました。');
    } else {
      logger.error(`Slack通知処理が失敗しました: ${Result.getError(slackResult)}`);
    }
  } catch (e) {
    handleError(e, 'notifyLunchOrdersToSlack');
  }
}
