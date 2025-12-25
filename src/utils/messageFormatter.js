/**
 * Slackメッセージのフォーマット関連のユーティリティ関数を提供します。
 */

/**
 * 次回の注文募集アナウンスをSlack通知用に整形
 * @param {string} orderAppUrl - 注文アプリのURL
 * @returns {string} Slackメッセージ
 */
function formatOrderAnnouncementForSlack(orderAppUrl) {
  return `<!channel> 次回のお弁当の注文を受け付けます\nアプリに記入をお願いします\n${orderAppUrl}`;
}

/**
 * 注文変更をSlack通知用に整形
 * @param {Object} changes - { added: [], cancelled: [] }
 * @param {string} weekType - 'current' or 'next'
 * @param {string} detectedAt - 検知日時
 * @returns {string} Slackメッセージ
 */
function formatOrderChangesForSlack(changes, weekType, detectedAt) {
  const emoji = weekType === 'current' ? '🚨' : '🔄';
  const weekLabel = weekType === 'current' ? '今週分' : '次回分';

  let message = `${emoji} 【${weekLabel}】注文変更を検知しました（${detectedAt}）\n\n`;

  // 追加された注文
  if (changes.added.length > 0) {
    message += '【追加】\n';
    changes.added.forEach((change) => {
      const formattedDate = formatJapaneseDateWithDay(change.date);
      const countLabel = change.count > 1 ? ` (${change.count}個)` : '';
      message += `- ${formattedDate} ${change.name} ${change.size}${countLabel}\n`;
    });
    message += '\n';
  }

  // キャンセルされた注文
  if (changes.cancelled.length > 0) {
    message += '【キャンセル】\n';
    changes.cancelled.forEach((change) => {
      const formattedDate = formatJapaneseDateWithDay(change.date);
      const countLabel = change.count > 1 ? ` (${change.count}個)` : '';
      message += `- ${formattedDate} ${change.name} ${change.size}${countLabel}\n`;
    });
    message += '\n';
  }

  message += '弁当屋さん宛のメール下書きを作成します。';

  return message;
}

/**
 * 取得したランチ注文データをSlackメッセージ用に整形します。
 *
 * @param {Array<Object>} orders 取得した注文データの配列。各オブジェクトは { date: string, name: string, size: string, count: number } の形式。
 * @returns {string} 整形されたSlackメッセージ文字列。
 */
function formatLunchOrdersForSlack(orders) {
  if (!orders || orders.length === 0) {
    return '【次回の弁当注文状況🍱】\n次回の弁当注文はありませんでした。';
  }

  // 日付ごとに注文をグループ化
  const groupedOrders = orders.reduce((acc, order) => {
    const date = order.date; // YYYY/MM/DD形式
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push({ name: order.name, size: order.size, count: order.count });
    return acc;
  }, {});

  let message = '【次回の弁当注文状況🍱】\n';

  // 日付でソートしてメッセージに追加
  Object.keys(groupedOrders)
    .sort()
    .forEach((dateStr) => {
      const formattedDate = formatJapaneseDateWithDay(dateStr); // MM/DD (曜日) 形式に変換
      const dailyOrders = groupedOrders[dateStr];

      const orderDetails = dailyOrders
        .map((order) => {
          const countLabel = order.count > 1 ? ` (${order.count}個)` : '';
          return `${order.name} ${order.size}${countLabel}`;
        })
        .join(', ');
      message += `- ${formattedDate}: ${orderDetails}\n`;
    });

  return message;
}
