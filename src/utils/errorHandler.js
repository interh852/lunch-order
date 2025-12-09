/**
 * エラーハンドリングの共通処理を提供します。
 */

/**
 * アプリケーション固有のエラークラス
 */
class AppError extends Error {
  constructor(message, context = '') {
    super(message);
    this.name = 'AppError';
    this.context = context;
  }
}

/**
 * エラーを統一的にログ出力します。
 * 
 * @param {Error} error エラーオブジェクト
 * @param {string} context エラーが発生したコンテキスト（関数名やモジュール名など）
 * @param {boolean} includeStack スタックトレースを出力するかどうか（デフォルト: true）
 */
function handleError(error, context = '', includeStack = true) {
  const logger = getContextLogger('handleError');
  const errorMessage = error.message || 'Unknown error';
  const contextPrefix = context ? `[${context}] ` : '';
  
  logger.error(`${contextPrefix}エラーが発生しました: ${errorMessage}`);
  
  if (includeStack && error.stack) {
    logger.error(`スタックトレース:\n${error.stack}`);
  }
}

/**
 * 処理をtry-catchでラップし、エラー発生時に共通処理を実行します。
 * 
 * @param {Function} fn 実行する関数
 * @param {string} context エラーが発生した際のコンテキスト
 * @param {*} defaultReturnValue エラー時のデフォルト戻り値
 * @returns {*} 関数の実行結果、またはエラー時はdefaultReturnValue
 */
function tryCatch(fn, context = '', defaultReturnValue = null) {
  try {
    return fn();
  } catch (error) {
    handleError(error, context);
    return defaultReturnValue;
  }
}

/**
 * 非同期処理をtry-catchでラップし、エラー発生時に共通処理を実行します。
 * 
 * @param {Function} fn 実行する非同期関数
 * @param {string} context エラーが発生した際のコンテキスト
 * @param {*} defaultReturnValue エラー時のデフォルト戻り値
 * @returns {Promise<*>} 関数の実行結果、またはエラー時はdefaultReturnValue
 */
async function tryCatchAsync(fn, context = '', defaultReturnValue = null) {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return defaultReturnValue;
  }
}

/**
 * 条件が満たされない場合にAppErrorをスローします。
 * 
 * @param {boolean} condition チェックする条件
 * @param {string} message エラーメッセージ
 * @param {string} context エラーのコンテキスト
 * @throws {AppError} 条件が満たされない場合
 */
function assert(condition, message, context = '') {
  if (!condition) {
    throw new AppError(message, context);
  }
}
