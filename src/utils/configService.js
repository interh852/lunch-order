/**
 * 設定値の読み込みと管理を行うサービス
 * 設定値はスプレッドシートおよびスクリプトプロパティから読み込まれ、キャッシュされます。
 */

let cachedConfig = null;

/**
 * 設定値を読み込み、キャッシュして返すメイン関数。
 * 2回目以降の呼び出しではキャッシュされた値を返す。
 * @returns {Object|null} 設定オブジェクト、またはエラーの場合はnull
 */
function getConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  // JavaScriptの関数ホイスティングにより、下で定義されているヘルパー関数を呼び出せます
  cachedConfig = _loadAndBuildFullConfig();
  return cachedConfig;
}

/**
 * キャッシュされた設定をクリアして再読み込みする
 * スプレッドシートの設定値を変更した後に呼び出すことで、最新の設定を取得できます
 * @returns {Object|null} 新しい設定オブジェクト、またはエラーの場合はnull
 */
function refreshConfig() {
  const logger = getContextLogger('refreshConfig');
  logger.info('設定をリフレッシュします...');
  cachedConfig = null;
  const newConfig = getConfig();
  if (newConfig) {
    logger.info('設定のリフレッシュが完了しました。');
  } else {
    logger.error('設定のリフレッシュに失敗しました。');
  }
  return newConfig;
}

// --- 以下、ヘルパー関数 ---

/**
 * 実際に設定を読み込み、完全な設定オブジェクトを構築する。
 * @private
 * @returns {Object|null} 構築された設定オブジェクト、またはエラーの場合はnull
 */
function _loadAndBuildFullConfig() {
  const logger = getContextLogger('_loadAndBuildFullConfig');

  try {
    const spreadsheetId = _getSpreadsheetIdFromProperties();
    if (!spreadsheetId) {
      return null;
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(PROMPT_SHEET_NAME);
    if (!sheet) {
      logger.error(`エラー: スプレッドシートに「${PROMPT_SHEET_NAME}」シートが見つかりません。`);
      return null;
    }

    // 各種設定値の取得
    let modelName = sheet.getRange(GEMINI_MODEL_CELL).getValue() || 'gemini-pro-vision';
    const geminiPrompt = sheet.getRange(GEMINI_PROMPT_CELL).getValue();
    const gmailQuery = sheet.getRange(GMAIL_QUERY_CELL).getValue();
    const botToken = sheet.getRange(SLACK_BOT_TOKEN_CELL).getValue();
    const channelId = sheet.getRange(SLACK_CHANNEL_ID_CELL).getValue();
    const orderAppUrl = sheet.getRange(ORDER_APP_URL_CELL).getValue();
    const lunchProviderEmail = sheet.getRange(C_MAIL_ADRESS_CELL).getValue();

    // 総務担当者情報と単価設定
    const gaName = sheet.getRange(CELL_ADDRESSES.GENERAL_AFFAIRS_NAME).getValue();
    const gaEmail = sheet.getRange(CELL_ADDRESSES.GENERAL_AFFAIRS_EMAIL).getValue();
    const price1_8 = sheet.getRange(CELL_ADDRESSES.PRICE_RANGE_1_8).getValue();
    const price9_13 = sheet.getRange(CELL_ADDRESSES.PRICE_RANGE_9_13).getValue();
    const price14Plus = sheet.getRange(CELL_ADDRESSES.PRICE_RANGE_14_PLUS).getValue();
    const gmailQueryInvoice = sheet.getRange(CELL_ADDRESSES.GMAIL_QUERY_INVOICE).getValue();
    const invoicePrompt = sheet.getRange(CELL_ADDRESSES.INVOICE_PROMPT).getValue();

    // 2026年2月価格改定用マトリックスの取得
    const newPrices = {
      range1_8: {
        small: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_1_8_SMALL).getValue(),
        regular: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_1_8_REGULAR).getValue(),
        large: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_1_8_LARGE).getValue(),
      },
      range9_13: {
        small: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_9_13_SMALL).getValue(),
        regular: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_9_13_REGULAR).getValue(),
        large: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_9_13_LARGE).getValue(),
      },
      range14Plus: {
        small: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_14_PLUS_SMALL).getValue(),
        regular: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_14_PLUS_REGULAR).getValue(),
        large: sheet.getRange(CELL_ADDRESSES.NEW_PRICE_RANGE_14_PLUS_LARGE).getValue(),
      },
    };

    // 必須項目のチェック
    if (!geminiPrompt || !gmailQuery || !botToken || !channelId || !gmailQueryInvoice || !invoicePrompt) {
      logger.error(
        'エラー: スプレッドシートから必須の設定値（プロンプト、Gmailクエリ、Slackトークン、チャンネルID、請求書クエリ、請求書プロンプト）が取得できませんでした。'
      );
      return null;
    }

    return {
      spreadsheetId: spreadsheetId,
      prompt: geminiPrompt,
      invoicePrompt: invoicePrompt,
      modelName: modelName,
      gmailQuery: gmailQuery,
      gmailQueryInvoice: gmailQueryInvoice,
      orderAppUrl: orderAppUrl,
      lunchProviderEmail: lunchProviderEmail,
      slack: {
        botToken: botToken,
        channelId: channelId,
      },
      generalAffairs: {
        name: gaName,
        email: gaEmail,
      },
      prices: {
        range1_8: price1_8,
        range9_13: price9_13,
        range14Plus: price14Plus,
      },
      newPrices: newPrices,
    };
  } catch (e) {
    handleError(e, '_loadAndBuildFullConfig');
    return null;
  }
}

/**
 * スクリプトプロパティからスプレッドシートIDを取得します。
 * @private
 * @returns {string|null} スプレッドシートID、または未設定の場合はnull
 */
function _getSpreadsheetIdFromProperties() {
  try {
    const propertyManager = getPropertyManager();
    return propertyManager.getSpreadsheetId();
  } catch (e) {
    handleError(e, '_getSpreadsheetIdFromProperties');
    return null;
  }
}
