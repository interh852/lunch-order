/**
 * スプレッドシートから設定値を取得する
 */

/**
 * スプレッドシートから設定（プロンプト、モデル名、Gmail検索クエリなど）を取得する
 * @returns {{prompt: string, modelName: string, gmailQuery: string}|null} 設定オブジェクト、またはエラーの場合はnull
 */
function getConfigFromSpreadsheet() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      console.error('エラー: スクリプトプロパティ「SPREADSHEET_ID」が設定されていません。');
      return null;
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(PROMPT_SHEET_NAME);
    if (!sheet) {
      console.error(`エラー: スプレッドシートに「${PROMPT_SHEET_NAME}」シートが見つかりません。`);
      return null;
    }

    // モデル名の取得
    let modelName = sheet.getRange(GEMINI_MODEL_CELL).getValue();
    if (!modelName) {
      console.log(`Geminiモデル名がスプレッドシートの${GEMINI_MODEL_CELL}セルに設定されていません。デフォルトモデルを使用します。`);
      modelName = 'gemini-pro-vision'; // デフォルトモデル
    }

    // プロンプトの取得
    const geminiPrompt = sheet.getRange(GEMINI_PROMPT_CELL).getValue();
    if (!geminiPrompt) {
      console.log(`Geminiプロンプトがスプレッドシートの${GEMINI_PROMPT_CELL}セルに設定されていません。`);
      return null;
    }

    // Gmail検索クエリの取得
    const gmailQuery = sheet.getRange(GMAIL_QUERY_CELL).getValue();
    if (!gmailQuery) {
      console.log(`Gmail検索クエリがスプレッドシートの${GMAIL_QUERY_CELL}セルに設定されていません。`);
      return null;
    }

    return {
      prompt: geminiPrompt,
      modelName: modelName,
      gmailQuery: gmailQuery
    };

  } catch (e) {
    console.error(`スプレッドシートからの設定取得中にエラーが発生しました: ${e.message}`);
    return null;
  }
}
