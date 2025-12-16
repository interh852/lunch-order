/**
 * Gmail検索サービス
 * オーダーメールの送信状態を確認するための検索機能を提供
 */

/**
 * 指定期間のオーダーメールが送信済みかチェック
 * @param {string} startDate - 開始日 (YYYY/MM/DD)
 * @param {string} endDate - 終了日 (YYYY/MM/DD)
 * @returns {boolean} 送信済みならtrue
 */
function hasOrderEmailBeenSent(startDate, endDate) {
  const logger = getContextLogger('hasOrderEmailBeenSent');
  
  try {
    const query = buildOrderEmailSearchQuery(startDate, endDate);
    logger.debug(`Gmail検索クエリ: ${query}`);
    
    const threads = GmailApp.search(query);
    const found = threads.length > 0;
    
    if (found) {
      logger.info(`オーダーメール送信済み: ${startDate}〜${endDate} (${threads.length}件)`);
    } else {
      logger.debug(`オーダーメール未送信: ${startDate}〜${endDate}`);
    }
    
    return found;
    
  } catch (e) {
    handleError(e, 'hasOrderEmailBeenSent');
    return false;
  }
}

/**
 * Gmail検索クエリを生成
 * @param {string} startDate - 開始日 (YYYY/MM/DD)
 * @param {string} endDate - 終了日 (YYYY/MM/DD)
 * @returns {string} 検索クエリ
 */
function buildOrderEmailSearchQuery(startDate, endDate) {
  // YYYY/MM/DD から M/D 形式に変換（例: 2025/12/16 → 12/16）
  const startParts = startDate.split('/');
  const endParts = endDate.split('/');
  
  const startMonthDay = `${parseInt(startParts[1])}/${parseInt(startParts[2])}`;
  const endMonthDay = `${parseInt(endParts[1])}/${parseInt(endParts[2])}`;
  
  // 検索クエリを構築
  // 例: in:sent subject:12/16 subject:12/20 subject:弁当 newer_than:14d
  const keywords = GMAIL_SEARCH.SUBJECT_KEYWORDS.map(kw => `subject:${kw}`).join(' ');
  const query = `in:sent subject:${startMonthDay} subject:${endMonthDay} ${keywords} newer_than:${GMAIL_SEARCH.SEARCH_DAYS_BACK}d`;
  
  return query;
}
