/**
 * 注文変更検知プロセッサー
 * スナップショット比較により注文の追加・キャンセルを検知する
 */

// ==========================================
// メイン関数（公開API）
// ==========================================

/**
 * メイン処理：今週・次回の注文変更を検知して通知
 */
function detectOrderChangesAndNotify() {
  const logger = getContextLogger('detectOrderChangesAndNotify');
  logger.info('==========================================');
  logger.info('   注文変更検知処理を開始します');
  logger.info('==========================================');

  try {
    const today = new Date();
    const results = [];

    // 1. 今週分の変更検知
    logger.info('\n【今週分のチェック】');
    const currentWeekdays = getCurrentWeekdays(today);
    const currentResult = detectChangesForWeek(currentWeekdays, 'current');
    if (currentResult) {
      results.push(currentResult);
    }

    // 2. 次回分の変更検知
    logger.info('\n【次回分のチェック】');
    const nextWeekdays = getNextWeekdays(today);
    const nextResult = detectChangesForWeek(nextWeekdays, 'next');
    if (nextResult) {
      results.push(nextResult);
    }

    // 3. 結果サマリー
    logger.info('\n==========================================');
    logger.info('   検知結果サマリー');
    logger.info('==========================================');

    if (results.length === 0) {
      logger.info('✅ 変更なし、または送信前のため処理をスキップしました。');
    } else {
      results.forEach((result) => {
        const weekLabel = result.weekType === 'current' ? '今週' : '次回';
        const addedCount = result.changes.added.length;
        const cancelledCount = result.changes.cancelled.length;
        logger.info(`\n${weekLabel}分: 追加${addedCount}件 / キャンセル${cancelledCount}件`);

        // Slack通知を送信
        notifyChanges(result);
      });
    }

    logger.info('\n処理完了');
    return results;
  } catch (e) {
    handleError(e, 'detectOrderChangesAndNotify');
    return [];
  }
}

// ==========================================
// ヘルパー関数（内部実装）
// ==========================================
// 処理フロー順に配置：週次検知 → 差分比較 → 更新 → 通知

/**
 * 指定週の注文変更を検知
 * @param {string[]} weekdays - 平日の日付配列 (YYYY/MM/DD)
 * @param {string} weekType - 'current' or 'next'
 * @returns {Object|null} 変更情報 or null
 */
function detectChangesForWeek(weekdays, weekType) {
  const logger = getContextLogger('detectChangesForWeek');

  try {
    const startDate = weekdays[0];
    const endDate = weekdays[weekdays.length - 1];
    const periodKey = generatePeriodKey(startDate, endDate);

    logger.info(
      `=== ${weekType === 'current' ? '今週' : '次回'}の変更検知開始: ${startDate}〜${endDate} ===`
    );

    // 1. オーダー送信済みかチェック
    if (!shouldDetectChanges(weekdays, weekType)) {
      return null;
    }

    // 2. スナップショットを取得（初回は自動保存してnull）
    const previousOrders = getOrLoadSnapshot(weekdays, periodKey);
    if (!previousOrders) {
      return null;
    }

    // 3. 現在の注文を取得
    const currentOrders = getCurrentOrders(weekdays);

    // 4. 差分を比較
    const changes = compareOrderSnapshots(previousOrders, currentOrders);

    // 5. 変更がなければ終了
    if (!hasChanges(changes)) {
      logger.info(`${weekType === 'current' ? '今週' : '次回'}の注文に変更はありません。`);
      return null;
    }

    logger.info(
      `${weekType === 'current' ? '今週' : '次回'}の変更検知: 追加${changes.added.length}件, キャンセル${changes.cancelled.length}件`
    );

    // 6. オーダーカードを更新
    updateOrderCard(weekdays, currentOrders);

    // 7. スナップショットを更新（変更後の状態を保存）
    saveOrderSnapshot(periodKey, currentOrders);
    logger.info('スナップショットを更新しました。');

    // 8. 結果を返す
    return buildChangeResult(weekdays, weekType, changes);
  } catch (e) {
    handleError(e, 'detectChangesForWeek');
    return null;
  }
}

/**
 * 注文の差分を比較
 * @param {Array<Object>} previousOrders - 前回のスナップショット
 * @param {Array<Object>} currentOrders - 現在の注文履歴
 * @returns {Object} { added: [], cancelled: [], quantityChanges: [] }
 */
function compareOrderSnapshots(previousOrders, currentOrders) {
  const logger = getContextLogger('compareOrderSnapshots');

  try {
    // 1. 前回の注文をMapに変換（高速検索用）
    const previousMap = new Map();
    previousOrders.forEach((order) => {
      // サイズを正規化（スナップショット保存時に正規化済みだが念のため）
      const normalizedOrder = {
        date: order.date,
        name: order.name,
        size: normalizeSizeCategory(order.size),
        count: order.count || 1,
      };
      const key = generateOrderKeyWithCount(normalizedOrder);
      previousMap.set(key, normalizedOrder);
    });

    // 2. 現在の注文をMapに変換
    const currentMap = new Map();
    currentOrders.forEach((order) => {
      // サイズを正規化してから比較
      const normalizedOrder = {
        date: order.date,
        name: order.name,
        size: normalizeSizeCategory(order.size),
        count: order.count || 1,
      };
      const key = generateOrderKeyWithCount(normalizedOrder);
      currentMap.set(key, normalizedOrder);
    });

    // 3. 追加された注文を検知
    const added = [];
    currentMap.forEach((order, key) => {
      if (!previousMap.has(key)) {
        added.push({
          date: order.date,
          name: order.name,
          size: order.size,
          count: order.count,
          changeType: 'added',
        });
      }
    });

    // 4. キャンセルされた注文を検知
    const cancelled = [];
    previousMap.forEach((order, key) => {
      if (!currentMap.has(key)) {
        cancelled.push({
          date: order.date,
          name: order.name,
          size: order.size,
          count: order.count,
          changeType: 'cancelled',
        });
      }
    });

    // 5. 日付×サイズごとの変更前後の数量を計算
    const quantityChanges = {};

    // 変更前の数量を集計
    previousOrders.forEach((order) => {
      const normalizedSize = normalizeSizeCategory(order.size);
      const key = `${order.date}_${normalizedSize}`;
      if (!quantityChanges[key]) {
        quantityChanges[key] = { date: order.date, size: normalizedSize, before: 0, after: 0 };
      }
      quantityChanges[key].before += order.count || 1;
    });

    // 変更後の数量を集計
    currentOrders.forEach((order) => {
      const normalizedSize = normalizeSizeCategory(order.size);
      const key = `${order.date}_${normalizedSize}`;
      if (!quantityChanges[key]) {
        quantityChanges[key] = { date: order.date, size: normalizedSize, before: 0, after: 0 };
      }
      quantityChanges[key].after += order.count || 1;
    });

    // 変更があったものだけをフィルタ
    const quantityChangesArray = Object.values(quantityChanges).filter(
      (item) => item.before !== item.after
    );

    logger.debug(
      `差分検知結果: 追加${added.length}件, キャンセル${cancelled.length}件, 数量変更${quantityChangesArray.length}件`
    );

    return { added, cancelled, quantityChanges: quantityChangesArray };
  } catch (e) {
    handleError(e, 'compareOrderSnapshots');
    return { added: [], cancelled: [], quantityChanges: [] };
  }
}

/**
 * 注文の一意キーを生成（個数を含む）
 * 日付_注文者_サイズ_個数の組み合わせで一意に識別する
 * @param {Object} order - 注文オブジェクト {date, name, size, count}
 * @returns {string} 一意キー (例: "2025/12/16_山田太郎_普通_1")
 */
function generateOrderKeyWithCount(order) {
  return `${order.date}_${order.name}_${order.size}_${order.count || 1}`;
}

/**
 * オーダーカードを最新の注文内容に更新
 * @param {string[]} weekdays - 平日の日付配列 (YYYY/MM/DD)
 * @param {Array<Object>} orders - 最新の注文データ
 */
function updateOrderCard(weekdays, orders) {
  const logger = getContextLogger('updateOrderCard');

  try {
    logger.info('オーダーカードを更新します...');

    // 1. 日付×サイズごとに集計
    const aggregatedOrders = aggregateOrdersByDateAndSize(orders);

    // 2. 日付を月ごとにグループ化
    const datesByMonth = groupDateStringsByMonth(weekdays);

    // 3. 月ごとにオーダーカードに書き込み
    Object.keys(datesByMonth).forEach((yearMonth) => {
      const dateStringsInMonth = datesByMonth[yearMonth];

      // 該当月のオーダーカードを取得
      const orderCardSpreadsheet = getOrderCardSpreadsheetByYearMonth(yearMonth);
      if (!orderCardSpreadsheet) {
        logger.error(`${yearMonth}のオーダーカードが見つかりませんでした。`);
        return;
      }

      // 書き込み実行
      writeAggregatedOrdersToSpreadsheet(
        orderCardSpreadsheet,
        aggregatedOrders,
        dateStringsInMonth
      );
      logger.info(`${yearMonth}のオーダーカードを更新しました。`);
    });

    // スプレッドシートへの書き込みを確実に反映
    SpreadsheetApp.flush();
    logger.info('✅ オーダーカードの更新が完了しました。');
  } catch (e) {
    handleError(e, 'updateOrderCard');
  }
}

/**
 * 変更内容を通知（Slack + Gmail下書き）
 * @param {Object} changeResult - 変更検知結果
 */
function notifyChanges(changeResult) {
  const logger = getContextLogger('notifyChanges');

  try {
    // 1. Slack通知を送信
    sendSlackNotification(changeResult);

    // 2. Gmail下書きを作成
    createEmailDraftForChanges(changeResult);
  } catch (e) {
    handleError(e, 'notifyChanges');
  }
}

/**
 * Slack通知を送信
 * @param {Object} changeResult - 変更検知結果
 */
function sendSlackNotification(changeResult) {
  const logger = getContextLogger('sendSlackNotification');

  try {
    const detectedAt = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      DATE_FORMATS.TIMESTAMP
    );

    const message = formatOrderChangesForSlack(
      changeResult.changes,
      changeResult.weekType,
      detectedAt
    );

    logger.debug('Slack通知メッセージ:\n' + message);

    const slackResult = sendToSlack(message);

    if (Result.isSuccess(slackResult)) {
      logger.info('✅ Slack通知を送信しました。');
    } else {
      logger.error(`❌ Slack通知の送信に失敗しました: ${Result.getError(slackResult)}`);
    }
  } catch (e) {
    handleError(e, 'sendSlackNotification');
  }
}

/**
 * 変更通知用のGmail下書きを作成
 * @param {Object} changeResult - 変更検知結果
 */
function createEmailDraftForChanges(changeResult) {
  const logger = getContextLogger('createEmailDraftForChanges');

  try {
    const config = getConfig();
    if (!config) {
      logger.error('設定の取得に失敗しました。');
      return;
    }
    const bentoMailAddress = config.bentoMailAddress;

    if (!bentoMailAddress) {
      logger.error('BENTO_MAIL_ADDRESSが設定されていません。メール下書きの作成をスキップします。');
      return;
    }

    // オーダーカードをExcel形式でエクスポート
    const excelAttachments = exportOrderCardsForPeriod(
      changeResult.period.start,
      changeResult.period.end
    );

    if (!excelAttachments || excelAttachments.length === 0) {
      logger.error('オーダーカードのエクスポートに失敗しました。');
      return;
    }

    // メール下書きを作成
    const draft = createOrderChangeEmailDraft(
      bentoMailAddress,
      changeResult.period,
      changeResult.changes,
      excelAttachments,
      changeResult.weekType
    );

    if (draft) {
      logger.info('✅ Gmail下書きを作成しました。');
    } else {
      logger.error('❌ Gmail下書きの作成に失敗しました。');
    }
  } catch (e) {
    handleError(e, 'createEmailDraftForChanges');
  }
}

// ==========================================
// ユーティリティ関数
// ==========================================

/**
 * 変更検知が必要かチェック（オーダー送信済みか確認）
 * @param {Array<string>} weekdays - 平日の日付配列
 * @param {string} weekType - 'current' or 'next'
 * @returns {boolean} 検知が必要ならtrue
 */
function shouldDetectChanges(weekdays, weekType) {
  const logger = getContextLogger('shouldDetectChanges');
  const startDate = weekdays[0];
  const endDate = weekdays[weekdays.length - 1];

  const isSent = hasOrderEmailBeenSent(startDate, endDate);
  if (!isSent) {
    logger.info(`${weekType === 'current' ? '今週' : '次回'}のオーダーはまだ送信されていません。`);
    return false;
  }

  logger.info('オーダー送信済みを確認しました。');
  return true;
}

/**
 * スナップショットを取得または初回作成
 * @param {Array<string>} weekdays - 平日の日付配列
 * @param {string} periodKey - 期間キー
 * @returns {Array<Object>|null} スナップショット（初回はnull）
 */
function getOrLoadSnapshot(weekdays, periodKey) {
  const logger = getContextLogger('getOrLoadSnapshot');

  const previousOrders = loadOrderSnapshot(periodKey);
  if (!previousOrders) {
    logger.warn(`スナップショットが見つかりません。初回実行の可能性があります。`);
    logger.info('現在の状態をスナップショットとして保存します。');

    // 現在の状態をスナップショットとして保存して終了
    const currentOrders = getLunchOrdersForNextWeek(weekdays);
    if (currentOrders && currentOrders.length > 0) {
      saveOrderSnapshot(periodKey, currentOrders);
      logger.info('スナップショットを保存しました。次回から変更検知が可能になります。');
    }
    return null;
  }

  logger.info(`スナップショット取得: ${previousOrders.length}件`);
  return previousOrders;
}

/**
 * 現在の注文データを取得
 * @param {Array<string>} weekdays - 平日の日付配列
 * @returns {Array<Object>} 注文データ
 */
function getCurrentOrders(weekdays) {
  const logger = getContextLogger('getCurrentOrders');
  const currentOrders = getLunchOrdersForNextWeek(weekdays);
  logger.info(`現在の注文取得: ${currentOrders.length}件`);
  return currentOrders;
}

/**
 * 変更があるかチェック
 * @param {Object} changes - 変更情報
 * @returns {boolean} 変更があればtrue
 */
function hasChanges(changes) {
  return changes.added.length > 0 || changes.cancelled.length > 0;
}

/**
 * 変更検知結果オブジェクトを構築
 * @param {Array<string>} weekdays - 平日の日付配列
 * @param {string} weekType - 'current' or 'next'
 * @param {Object} changes - 変更情報
 * @returns {Object} 変更検知結果
 */
function buildChangeResult(weekdays, weekType, changes) {
  return {
    weekType: weekType,
    period: {
      start: weekdays[0],
      end: weekdays[weekdays.length - 1],
    },
    changes: changes,
  };
}

/**
 * 注文の一意キーを生成
 * 日付_注文者_サイズの組み合わせで一意に識別する
 * @param {Object} order - 注文オブジェクト {date, name, size}
 * @returns {string} 一意キー (例: "2025/12/16_山田太郎_普通")
 */
function generateOrderKey(order) {
  return `${order.date}_${order.name}_${order.size}`;
}
