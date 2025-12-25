/**
 * ランチ注文状況を処理し、Slackに通知するメインロジックを提供します。
 */

/**
 * 次回の注文募集アナウンスをSlackに投稿する
 */
function announceNextWeekOrderToSlack() {
  const logger = getContextLogger('announceNextWeekOrderToSlack');
  logger.info('次回の注文募集アナウンスを開始します。');

  try {
    // 0. 次回の日付範囲を取得（メニューがある週を探索）
    let targetBaseDate = new Date();
    let nextWeekdays = getNextWeekdays(targetBaseDate);

    // メニューが存在する週が見つかるまで、最大4週間先まで探索する
    let weeksChecked = 0;
    const MAX_WEEKS_AHEAD = 4;
    let menuFound = false;

    while (weeksChecked < MAX_WEEKS_AHEAD) {
      if (hasMenuForRange(nextWeekdays)) {
        menuFound = true;
        break;
      }

      logger.info(
        `期間 ${nextWeekdays[0]} 〜 ${nextWeekdays[nextWeekdays.length - 1]} のメニューが登録されていないため、翌週をチェックします。`
      );

      // 1週間進める
      targetBaseDate.setDate(targetBaseDate.getDate() + 7);
      nextWeekdays = getNextWeekdays(targetBaseDate);
      weeksChecked++;
    }

    if (!menuFound) {
      logger.warn(
        `直近${MAX_WEEKS_AHEAD}週間分のメニューが見つからなかったため、募集アナウンスをスキップしました。`
      );
      return;
    }

    const startDate = nextWeekdays[0];
    const endDate = nextWeekdays[nextWeekdays.length - 1];

    if (hasOrderEmailBeenSent(startDate, endDate)) {
      logger.info(
        `期間（${startDate}〜${endDate}）の注文メールは既に送信済みのため、募集アナウンスをスキップします。`
      );
      return;
    }

    // 1. 設定からアプリURLを取得
    const config = getConfig();
    if (!config) {
      logger.error('設定の取得に失敗しました。');
      return;
    }

    const orderAppUrl = config.orderAppUrl;
    if (!orderAppUrl) {
      logger.error(
        '注文アプリのURLが設定されていません。スプレッドシート「情報」シートのB10セルを確認してください。'
      );
      return;
    }

    logger.info(`注文アプリURL: ${orderAppUrl}`);

    // 2. メッセージを整形
    const message = formatOrderAnnouncementForSlack(orderAppUrl);
    if (!message) {
      logger.error('Slackメッセージの整形に失敗しました。');
      return;
    }
    logger.debug('整形されたSlackメッセージ:\n' + message);

    // 3. Slackに投稿
    const result = sendToSlack(message);

    if (Result.isSuccess(result)) {
      logger.info('✅ 注文募集アナウンスをSlackに投稿しました。');
    } else {
      logger.error(`❌ Slack投稿に失敗しました: ${Result.getError(result)}`);
    }
  } catch (e) {
    handleError(e, 'announceNextWeekOrderToSlack');
  }
}

/**
 * 次回のランチ注文状況をSlackに通知するメイン処理関数
 */
function notifyLunchOrdersToSlack() {
  const logger = getContextLogger('notifyLunchOrdersToSlack');
  logger.info('ランチ注文状況のSlack通知処理を開始します。');

  try {
    // 1. 次回の日付範囲を取得（メニューがある週を探索）
    let targetBaseDate = new Date();
    let nextWeekdays = getNextWeekdays(targetBaseDate);

    // メニューが存在する週が見つかるまで、最大4週間先まで探索する
    let weeksChecked = 0;
    const MAX_WEEKS_AHEAD = 4;
    let menuFound = false;

    while (weeksChecked < MAX_WEEKS_AHEAD) {
      if (hasMenuForRange(nextWeekdays)) {
        menuFound = true;
        break;
      }

      logger.info(
        `期間 ${nextWeekdays[0]} 〜 ${nextWeekdays[nextWeekdays.length - 1]} のメニューが登録されていないため、翌週をチェックします。`
      );

      // 1週間進める
      targetBaseDate.setDate(targetBaseDate.getDate() + 7);
      nextWeekdays = getNextWeekdays(targetBaseDate);
      weeksChecked++;
    }

    if (!menuFound) {
      logger.warn(
        `直近${MAX_WEEKS_AHEAD}週間分のメニューが見つからなかったため、注文状況の通知をスキップしました。`
      );
      return;
    }

    if (!nextWeekdays || nextWeekdays.length === 0) {
      logger.warn('営業日を取得できませんでした。処理を終了します。');
      return;
    }
    logger.info(`通知対象の営業日: ${nextWeekdays.join(', ')}`);

    // 1.5 対象期間の注文メールが送信済みかチェック
    const startDate = nextWeekdays[0];
    const endDate = nextWeekdays[nextWeekdays.length - 1];

    if (hasOrderEmailBeenSent(startDate, endDate)) {
      logger.info(
        `期間（${startDate}〜${endDate}）の注文メールは既に送信済みのため、注文状況の通知をスキップします。`
      );
      return;
    }

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
