/**
 * スクリプトプロパティの管理を一元化するユーティリティ
 */

/**
 * スクリプトプロパティを管理するクラス
 */
class PropertyManager {
  constructor() {
    this.properties = PropertiesService.getScriptProperties();
  }

  /**
   * メニューフォルダIDを取得
   * @returns {string} メニューフォルダID
   * @throws {AppError} プロパティが未設定の場合
   */
  getMenuFolderId() {
    return this._getRequired('FOLDER_ID_MENU');
  }

  /**
   * オーダーカードフォルダIDを取得
   * @returns {string} オーダーカードフォルダID
   * @throws {AppError} プロパティが未設定の場合
   */
  getOrderCardFolderId() {
    return this._getRequired('FOLDER_ID_ORDER_CARD');
  }

  /**
   * スプレッドシートIDを取得
   * @returns {string} スプレッドシートID
   * @throws {AppError} プロパティが未設定の場合
   */
  getSpreadsheetId() {
    return this._getRequired('SPREADSHEET_ID');
  }

  /**
   * Gemini APIキーを取得
   * @returns {string} Gemini APIキー
   * @throws {AppError} プロパティが未設定の場合
   */
  getGeminiApiKey() {
    return this._getRequired('GEMINI_API_KEY');
  }

  /**
   * 必須プロパティを取得（未設定の場合はエラー）
   * @private
   * @param {string} key プロパティのキー
   * @returns {string} プロパティの値
   * @throws {AppError} プロパティが未設定の場合
   */
  _getRequired(key) {
    const value = this.properties.getProperty(key);
    if (!value) {
      throw new AppError(`スクリプトプロパティ「${key}」が設定されていません。`, 'PropertyManager');
    }
    return value;
  }

  /**
   * オプショナルなプロパティを取得（未設定の場合はデフォルト値を返す）
   * @param {string} key プロパティのキー
   * @param {string} defaultValue デフォルト値
   * @returns {string} プロパティの値またはデフォルト値
   */
  getOptional(key, defaultValue = '') {
    return this.properties.getProperty(key) || defaultValue;
  }

  /**
   * プロパティを設定
   * @param {string} key プロパティのキー
   * @param {string} value プロパティの値
   */
  setProperty(key, value) {
    this.properties.setProperty(key, value);
  }

  /**
   * 複数のプロパティを一括設定
   * @param {Object} properties キーと値のオブジェクト
   */
  setProperties(properties) {
    this.properties.setProperties(properties);
  }
}

/**
 * PropertyManagerのシングルトンインスタンスを取得
 * @returns {PropertyManager} PropertyManagerインスタンス
 */
function getPropertyManager() {
  if (!globalThis._propertyManagerInstance) {
    globalThis._propertyManagerInstance = new PropertyManager();
  }
  return globalThis._propertyManagerInstance;
}
