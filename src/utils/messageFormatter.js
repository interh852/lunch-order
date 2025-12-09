/**
 * Slackメッセージのフォーマット関連のユーティリティ関数を提供します。
 */

/**
 * 取得したランチ注文データをSlackメッセージ用に整形します。
 *
 * @param {Array<Object>} orders 取得した注文データの配列。各オブジェクトは { date: string, name: string, size: string } の形式。
 * @returns {string} 整形されたSlackメッセージ文字列。
 */
function formatLunchOrdersForSlack(orders) {
  if (!orders || orders.length === 0) {
    return '【来週の弁当注文状況🍱】\n来週の弁当注文はありませんでした。';
  }

  // 日付ごとに注文をグループ化
  const groupedOrders = orders.reduce((acc, order) => {
    const date = order.date; // YYYY/MM/DD形式
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push({ name: order.name, size: order.size });
    return acc;
  }, {});

  let message = '【来週の弁当注文状況🍱】\n';

  // 日付でソートしてメッセージに追加
  Object.keys(groupedOrders).sort().forEach(dateStr => {
    const formattedDate = formatJapaneseDateWithDay(dateStr); // MM/DD (曜日) 形式に変換
    const dailyOrders = groupedOrders[dateStr];

    const orderDetails = dailyOrders.map(order => `${order.name} ${order.size}`).join(', ');
    message += `- ${formattedDate}: ${orderDetails}\n`;
  });

  return message;
}
