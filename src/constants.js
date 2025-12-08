/**
 * プロジェクト全体で共有される定数
 */

// シート関連
const PROMPT_SHEET_NAME = '情報';
const MENU_SHEET_NAME = 'メニュー';
const ORDER_HISTORY_SHEET_NAME = '注文履歴';

// セル関連
const C_MAIL_ADRESS_CELL = 'B2';
const GMAIL_QUERY_CELL = 'B3';
const GEMINI_MODEL_CELL = 'B4';
const GEMINI_PROMPT_CELL = 'B5';
const SLACK_BOT_TOKEN_CELL = 'B6';
const SLACK_CHANNEL_ID_CELL = 'B7';

// ファイル関連
const PROCESSED_SUFFIX = '_processed';

// メニューPDFのファイル名パターン
const MENU_PDF_PATTERN = /^\d{4}|\d{2}\./;
