/**
 * ログレベルを管理し、統一的なログ出力を提供します
 */

/**
 * ログレベルの定義
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 99
};

/**
 * ログ出力を管理するクラス
 */
class Logger {
  /**
   * @param {number} level ログレベル（デフォルト: LogLevel.INFO）
   * @param {string} prefix ログの接頭辞（デフォルト: ''）
   */
  constructor(level = LogLevel.INFO, prefix = '') {
    this.level = level;
    this.prefix = prefix;
  }

  /**
   * ログレベルを設定
   * @param {number} level 新しいログレベル
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * ログレベルを取得
   * @returns {number} 現在のログレベル
   */
  getLevel() {
    return this.level;
  }

  /**
   * DEBUGレベルのログを出力
   * @param {string} message ログメッセージ
   * @param {...*} args 追加の引数
   */
  debug(message, ...args) {
    if (this.level <= LogLevel.DEBUG) {
      this._log('[DEBUG]', message, ...args);
    }
  }

  /**
   * INFOレベルのログを出力
   * @param {string} message ログメッセージ
   * @param {...*} args 追加の引数
   */
  info(message, ...args) {
    if (this.level <= LogLevel.INFO) {
      this._log('[INFO]', message, ...args);
    }
  }

  /**
   * WARNレベルのログを出力
   * @param {string} message ログメッセージ
   * @param {...*} args 追加の引数
   */
  warn(message, ...args) {
    if (this.level <= LogLevel.WARN) {
      this._log('[WARN]', message, ...args);
    }
  }

  /**
   * ERRORレベルのログを出力
   * @param {string} message ログメッセージ
   * @param {...*} args 追加の引数
   */
  error(message, ...args) {
    if (this.level <= LogLevel.ERROR) {
      this._log('[ERROR]', message, ...args);
    }
  }

  /**
   * 内部用ログ出力メソッド
   * @private
   * @param {string} levelLabel ログレベルラベル
   * @param {string} message ログメッセージ
   * @param {...*} args 追加の引数
   */
  _log(levelLabel, message, ...args) {
    const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), DATE_FORMATS.TIMESTAMP);
    
    if (args.length > 0) {
      console.log(`${timestamp} ${levelLabel} ${prefixStr}${message}`, ...args);
    } else {
      console.log(`${timestamp} ${levelLabel} ${prefixStr}${message}`);
    }
  }

  /**
   * 子ロガーを作成（接頭辞付き）
   * @param {string} childPrefix 子ロガーの接頭辞
   * @returns {Logger} 新しいLoggerインスタンス
   */
  child(childPrefix) {
    const newPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
    return new Logger(this.level, newPrefix);
  }
}

/**
 * グローバルロガーインスタンス
 */
let _globalLogger = null;

/**
 * グローバルロガーを取得
 * @returns {Logger} Loggerインスタンス
 */
function getLogger() {
  if (!_globalLogger) {
    // デフォルトはINFOレベル
    // 環境変数やスクリプトプロパティで変更可能にしたい場合はここで設定
    const level = LogLevel.INFO;
    _globalLogger = new Logger(level);
  }
  return _globalLogger;
}

/**
 * グローバルロガーのレベルを設定
 * @param {number} level 新しいログレベル
 */
function setGlobalLogLevel(level) {
  const logger = getLogger();
  logger.setLevel(level);
}

/**
 * コンテキスト付きロガーを取得
 * @param {string} context コンテキスト名（関数名やモジュール名など）
 * @returns {Logger} コンテキスト付きLoggerインスタンス
 */
function getContextLogger(context) {
  const logger = getLogger();
  return logger.child(context);
}
