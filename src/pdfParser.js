/**
 * PDFファイルを解析し、メニュー情報を抽出する
 */

/**
 * スプレッドシートからGeminiプロンプトを取得する。
 * @returns {string|null} Geminiプロンプト、またはエラーの場合は null
 */
function getGeminiPromptFromSpreadsheet() {
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
  const geminiPrompt = sheet.getRange(GEMINI_PROMPT_CELL).getValue();
  if (!geminiPrompt) {
    console.log(`Geminiプロンプトがスプレッドシートの${GEMINI_PROMPT_CELL}セルに設定されていません。処理を終了します。`);
    return null;
  }
  return geminiPrompt;
}

/**
 * PDFファイルからメニュー情報を解析して抽出する
 * @param {GoogleAppsScript.Drive.File} pdfFile - 解析対象のPDFファイル
 * @returns {Array<{date: string, menu: string}>|null} 抽出されたメニュー情報の配列、またはエラーの場合はnull
 */
function parsePdfMenu(pdfFile) {
  try {
    const pdfBlob = pdfFile.getBlob();
    
    // Geminiに送信するプロンプトをスプレッドシートから取得
    const prompt = getGeminiPromptFromSpreadsheet();
    if (!prompt) {
      return null;
    }

    const geminiResponse = callGeminiApi(prompt, pdfBlob);

    if (geminiResponse && geminiResponse.candidates && geminiResponse.candidates.length > 0) {
      const content = geminiResponse.candidates[0].content.parts[0].text;
      // GeminiからのレスポンスはJSONがマークダウンブロックに囲まれている場合があるため、それを取り除く
      const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const menuData = JSON.parse(jsonString);
      return menuData;
    } else {
      console.error('Geminiからの有効なレスポンスが得られませんでした。');
      return null;
    }

  } catch (e) {
    console.error(`PDFの解析中にエラーが発生しました: ${e.message}`);
    console.error(`スタックトレース: ${e.stack}`);
    return null;
  }
}
