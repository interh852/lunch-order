/**
 * ファイル名の正規化と検証を行うユーティリティ
 */

/**
 * ファイル名を正規化する
 *
 * 以下の処理を行います：
 * 1. 拡張子の直前にある 'pdf' または 'PDF' をピリオドで置換
 *    例: '24pdf.pdf' → '24.pdf', '2024.2pdf.pdf' → '2024.2.pdf'
 * 2. 英数字とピリオド以外の文字を削除
 *    例: '2024.9[更新済み].pdf' → '2024.9.pdf'
 * 3. 末尾のpdf拡張子を正規化
 *    例: '24.pdf.pdf' → '24.pdf'
 *
 * @param {string} originalFileName - 元のファイル名
 * @returns {string} 正規化されたファイル名
 */
function normalizeFileName(originalFileName) {
  if (!originalFileName || typeof originalFileName !== 'string') {
    const logger = getContextLogger('normalizeFileName');
    logger.warn('正規化対象のファイル名が無効です。');
    return '';
  }

  // A. 拡張子の直前にある 'pdf' または 'PDF' をピリオドで置換
  let tempName = originalFileName.replace(/(\d{2,4})(?:pdf|PDF)/, '$1.');

  // B. 英数字とピリオド以外の文字を削除
  let normalizedFileName = tempName.replace(/[^a-zA-Z0-9\.]/g, '');

  // C. 末尾のpdf拡張子を正規化（pdf.pdf や .pdf.pdf を .pdf に）
  return normalizedFileName.replace(/(?:\.pdf)?\.pdf$/i, '.pdf');
}

/**
 * ファイル名から年月を抽出する
 *
 * @param {string} fileName - ファイル名（例: '2024.12.pdf'）
 * @returns {{year: string, month: string}|null} 抽出された年と月、または抽出できなかった場合はnull
 */
function extractYearMonthFromFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  const match = fileName.match(/(\d{4})\.(\d{2})/);
  if (!match) {
    return null;
  }

  return {
    year: match[1],
    month: match[2],
  };
}

/**
 * メニューPDFのファイル名パターンかどうかを判定する
 *
 * @param {string} fileName - ファイル名（拡張子を除いた本体部分）
 * @returns {boolean} メニューPDFのパターンに一致する場合はtrue
 */
function isMenuPdfPattern(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  // MENU_PDF_PATTERN は constants.js で定義されている想定
  return MENU_PDF_PATTERN.test(fileName);
}

/**
 * ファイル名から拡張子を除いた本体部分を取得する
 *
 * @param {string} fileName - ファイル名
 * @returns {string} 拡張子を除いたファイル名
 */
function getFileNameWithoutExtension(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName;
  }

  return fileName.substring(0, lastDotIndex);
}

/**
 * ファイル名に処理済みサフィックスを追加する
 *
 * @param {string} fileName - 元のファイル名
 * @param {string} suffix - 追加するサフィックス（デフォルト: PROCESSED_SUFFIX）
 * @returns {string} サフィックスが追加されたファイル名
 */
function addProcessedSuffix(fileName, suffix = PROCESSED_SUFFIX) {
  if (!fileName || typeof fileName !== 'string') {
    return fileName;
  }

  return fileName.replace(/\.pdf$/i, `${suffix}.pdf`);
}

/**
 * ファイル名に処理済みサフィックスが含まれているかチェックする
 *
 * @param {string} fileName - チェックするファイル名
 * @param {string} suffix - チェックするサフィックス（デフォルト: PROCESSED_SUFFIX）
 * @returns {boolean} サフィックスが含まれている場合はtrue
 */
function hasProcessedSuffix(fileName, suffix = PROCESSED_SUFFIX) {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  return fileName.includes(suffix);
}
