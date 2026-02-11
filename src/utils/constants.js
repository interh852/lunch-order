/**
 * プロジェクト全体で共有される定数
 */

// ========================================
// シート関連の定数
// ========================================
const SHEET_NAMES = {
  PROMPT: '情報',
  MENU: 'メニュー',
  ORDER_HISTORY: '注文履歴',
  SNAPSHOT: '注文スナップショット',
};

// 後方互換性のため個別定数も維持
const PROMPT_SHEET_NAME = SHEET_NAMES.PROMPT;
const MENU_SHEET_NAME = SHEET_NAMES.MENU;
const ORDER_HISTORY_SHEET_NAME = SHEET_NAMES.ORDER_HISTORY;
const SNAPSHOT_SHEET_NAME = SHEET_NAMES.SNAPSHOT;

// ========================================
// セル関連の定数
// ========================================
const CELL_ADDRESSES = {
  C_MAIL_ADRESS: 'B2',
  GMAIL_QUERY: 'B3',
  GEMINI_MODEL: 'B4',
  GEMINI_PROMPT: 'B5',
  SLACK_BOT_TOKEN: 'B6',
  SLACK_CHANNEL_ID: 'B7',
  SENDER_NAME: 'B8',
  COMPANY_NAME: 'B9',
  ORDER_APP_URL: 'B10',
  GENERAL_AFFAIRS_NAME: 'B11',
  GENERAL_AFFAIRS_EMAIL: 'B12',
  PRICE_RANGE_1_8: 'B13',
  PRICE_RANGE_9_13: 'B14',
  PRICE_RANGE_14_PLUS: 'B15',
  GMAIL_QUERY_INVOICE: 'B16',
  INVOICE_PROMPT: 'B17',
  // 2026年2月価格改定用
  NEW_PRICE_RANGE_1_8_SMALL: 'B20',
  NEW_PRICE_RANGE_1_8_REGULAR: 'B21',
  NEW_PRICE_RANGE_1_8_LARGE: 'B22',
  NEW_PRICE_RANGE_9_13_SMALL: 'B23',
  NEW_PRICE_RANGE_9_13_REGULAR: 'B24',
  NEW_PRICE_RANGE_9_13_LARGE: 'B25',
  NEW_PRICE_RANGE_14_PLUS_SMALL: 'B26',
  NEW_PRICE_RANGE_14_PLUS_REGULAR: 'B27',
  NEW_PRICE_RANGE_14_PLUS_LARGE: 'B28',
};

// オーダーカード初期化用のセルアドレス
const ORDER_CARD_INIT_CELL = 'J3';

// 後方互換性のため個別定数も維持
const C_MAIL_ADRESS_CELL = CELL_ADDRESSES.C_MAIL_ADRESS;
const GMAIL_QUERY_CELL = CELL_ADDRESSES.GMAIL_QUERY;
const GEMINI_MODEL_CELL = CELL_ADDRESSES.GEMINI_MODEL;
const GEMINI_PROMPT_CELL = CELL_ADDRESSES.GEMINI_PROMPT;
const SLACK_BOT_TOKEN_CELL = CELL_ADDRESSES.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID_CELL = CELL_ADDRESSES.SLACK_CHANNEL_ID;
const SENDER_NAME_CELL = CELL_ADDRESSES.SENDER_NAME;
const COMPANY_NAME_CELL = CELL_ADDRESSES.COMPANY_NAME;
const ORDER_APP_URL_CELL = CELL_ADDRESSES.ORDER_APP_URL;

// ========================================
// シート行/列の定数
// ========================================
const SHEET_ROWS = {
  HEADER_ROW: 1, // ヘッダー行
  DATA_START_ROW: 2, // データ開始行
};

// 後方互換性のため個別定数も維持
const SHEET_HEADER_ROW = SHEET_ROWS.HEADER_ROW;
const SHEET_DATA_START_ROW = SHEET_ROWS.DATA_START_ROW;

// ========================================
// ファイル関連の定数
// ========================================
const FILE_CONSTANTS = {
  PROCESSED_SUFFIX: '_processed',
  MENU_PDF_PATTERN: /^\d{4}|\d{2}\./,
};

// 後方互換性のため個別定数も維持
const PROCESSED_SUFFIX = FILE_CONSTANTS.PROCESSED_SUFFIX;
const MENU_PDF_PATTERN = FILE_CONSTANTS.MENU_PDF_PATTERN;

// ========================================
// スクリプトプロパティのキー
// ========================================
const PROPERTY_KEYS = {
  FOLDER_ID_MENU: 'FOLDER_ID_MENU',
  FOLDER_ID_ORDER_CARD: 'FOLDER_ID_ORDER_CARD',
  FOLDER_ID_INVOICE: 'FOLDER_ID_INVOICE',
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  GEMINI_API_KEY: 'GEMINI_API_KEY',
};

// ========================================
// 設定のバリデーション
// ========================================
const VALIDATION_CONFIG = {
  // 必須のスクリプトプロパティ
  requiredProperties: [
    PROPERTY_KEYS.FOLDER_ID_MENU,
    PROPERTY_KEYS.FOLDER_ID_ORDER_CARD,
    PROPERTY_KEYS.FOLDER_ID_INVOICE,
    PROPERTY_KEYS.SPREADSHEET_ID,
    PROPERTY_KEYS.GEMINI_API_KEY,
  ],

  // 必須のシート
  requiredSheets: [SHEET_NAMES.PROMPT, SHEET_NAMES.MENU, SHEET_NAMES.ORDER_HISTORY],

  // 必須のセル
  requiredCells: [
    CELL_ADDRESSES.GMAIL_QUERY,
    CELL_ADDRESSES.GEMINI_MODEL,
    CELL_ADDRESSES.GEMINI_PROMPT,
    CELL_ADDRESSES.SLACK_BOT_TOKEN,
    CELL_ADDRESSES.SLACK_CHANNEL_ID,
  ],
};

// ========================================
// MIMEタイプの定数
// ========================================
const MIME_TYPES = {
  PDF: 'application/pdf',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
};

// ========================================
// HTTPリクエスト関連の定数
// ========================================
const HTTP_CONTENT_TYPES = {
  JSON: 'application/json',
  JSON_UTF8: 'application/json; charset=utf-8',
};

const HTTP_METHODS = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
};

// ========================================
// 外部API関連の定数
// ========================================
const API_ENDPOINTS = {
  SLACK_POST_MESSAGE: 'https://slack.com/api/chat.postMessage',
  GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
};

// ========================================
// スプレッドシート列インデックス（0-based）
// ========================================
const ORDER_HISTORY_COLUMNS = {
  ORDER_PERSON_NAME: 2, // C列 - 注文者名
  ORDER_DATE: 3, // D列 - 対象日付
  STORE_NAME: 4, // E列 - 店名
  ORDER_SIZE: 6, // G列 - サイズ
  ORDER_COUNT: 7, // H列 - 個数
};

const MENU_COLUMNS = {
  DATE: 0, // A列 - 日付
  STORE_NAME: 1, // B列 - 店名
  MENU: 2, // C列 - 弁当名
};

const SNAPSHOT_COLUMNS = {
  PERIOD_KEY: 0, // A列 - 期間キー (例: 2025.12.16-12.20)
  ORDER_DATE: 1, // B列 - 日付 (YYYY/MM/DD)
  ORDER_NAME: 2, // C列 - 注文者
  ORDER_SIZE: 3, // D列 - サイズ
  ORDER_COUNT: 4, // E列 - 個数
  SAVED_AT: 5, // F列 - 保存日時
};

// ========================================
// 日付フォーマット
// ========================================
const DATE_FORMATS = {
  YYYY_MM_DD_SLASH: 'yyyy/MM/dd',
  YYYY_MM_DD_HYPHEN: 'yyyy-mm-dd',
  TIMESTAMP: 'yyyy-MM-dd HH:mm:ss',
};

// ========================================
// オーダーカードレイアウト
// ========================================
const ORDER_CARD_LAYOUT = {
  FIRST_WEEK_BASE_ROW: 8, // 1週目の開始行
  ROWS_PER_WEEK: 5, // 週ごとの行数（大盛、普通、小盛、ご飯なし、空行）
  COLUMN_OFFSET: 4, // D列から開始
  COLUMNS_PER_DAY: 2, // 各曜日ごとの列数
};

// ========================================
// サイズカテゴリ
// ========================================
const SIZE_CATEGORIES = {
  LARGE: '大盛',
  REGULAR: '普通',
  SMALL: '小盛',
};

const SIZE_KEYWORDS = {
  LARGE: ['大', 'L'],
  SMALL: ['小', 'S'],
};

// ========================================
// Gmail検索関連の定数
// ========================================
const GMAIL_SEARCH = {
  SUBJECT_KEYWORDS: ['弁当', 'お弁当'],
  SEARCH_DAYS_BACK: 30, // 過去30日分を検索
  INVOICE_SEARCH_DAYS: 1, // 請求書検索の対象日数
};

// ========================================
// メール関連の定数
// ========================================
const EMAIL_TEMPLATES = {
  SUBJECT_PREFIX: 'のお弁当について',
  GREETING: '様\n\nいつもお世話になります。',
  BODY_MAIN: '次回のお弁当のオーダーカードを添付の通り送付させて頂きます。',
  CLOSING: '以上、よろしくお願いいたします。',
};

// ========================================
// バリデーション関数
// ========================================

/**
 * スクリプトプロパティが全て設定されているかチェックする
 * @returns {{valid: boolean, missing: string[]}} バリデーション結果
 */
function validateScriptProperties() {
  const properties = PropertiesService.getScriptProperties();
  const missing = [];

  VALIDATION_CONFIG.requiredProperties.forEach((key) => {
    if (!properties.getProperty(key)) {
      missing.push(key);
    }
  });

  return {
    valid: missing.length === 0,
    missing: missing,
  };
}

/**
 * スプレッドシートに必要なシートが全て存在するかチェックする
 * @param {string} spreadsheetId スプレッドシートID
 * @returns {{valid: boolean, missing: string[]}} バリデーション結果
 */
function validateRequiredSheets(spreadsheetId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const missing = [];

    VALIDATION_CONFIG.requiredSheets.forEach((sheetName) => {
      if (!spreadsheet.getSheetByName(sheetName)) {
        missing.push(sheetName);
      }
    });

    return {
      valid: missing.length === 0,
      missing: missing,
    };
  } catch (e) {
    return {
      valid: false,
      missing: VALIDATION_CONFIG.requiredSheets,
      error: e.message,
    };
  }
}

/**
 * サイズ文字列を正規化してカテゴリを返す
 * @param {string} size - サイズの文字列
 * @returns {string} 正規化されたサイズカテゴリ（大盛、普通、小盛）
 */
function normalizeSizeCategory(size) {
  if (!size) return SIZE_CATEGORIES.REGULAR;

  // 大盛の判定
  for (const keyword of SIZE_KEYWORDS.LARGE) {
    if (size.includes(keyword)) {
      return SIZE_CATEGORIES.LARGE;
    }
  }

  // 小盛の判定
  for (const keyword of SIZE_KEYWORDS.SMALL) {
    if (size.includes(keyword)) {
      return SIZE_CATEGORIES.SMALL;
    }
  }

  // デフォルトは普通
  return SIZE_CATEGORIES.REGULAR;
}

/**
 * 設定の完全なバリデーションを実行する
 * @returns {{valid: boolean, errors: string[]}} バリデーション結果
 */
function validateConfiguration() {
  const errors = [];

  // スクリプトプロパティのチェック
  const propertiesResult = validateScriptProperties();
  if (!propertiesResult.valid) {
    errors.push(`未設定のスクリプトプロパティ: ${propertiesResult.missing.join(', ')}`);
  }

  // スプレッドシートIDが設定されている場合はシートもチェック
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty(PROPERTY_KEYS.SPREADSHEET_ID);
  if (spreadsheetId) {
    const sheetsResult = validateRequiredSheets(spreadsheetId);
    if (!sheetsResult.valid) {
      if (sheetsResult.error) {
        errors.push(`スプレッドシートへのアクセスエラー: ${sheetsResult.error}`);
      } else {
        errors.push(`未作成のシート: ${sheetsResult.missing.join(', ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}
