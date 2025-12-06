/**
 * Gemini APIを呼び出すためのクライアント
 */

/**
 * スプレッドシートからGeminiモデル名を取得する。
 * @returns {string|null} Geminiモデル名、またはエラーの場合はnull
 */
function getGeminiModelNameFromSpreadsheet() {
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
  const modelName = sheet.getRange(GEMINI_MODEL_CELL).getValue();
  if (!modelName) {
    console.log(`Geminiモデル名がスプレッドシートの${GEMINI_MODEL_CELL}セルに設定されていません。デフォルトモデルを使用します。`);
    return 'gemini-pro-vision'; // デフォルトモデル
  }
  return modelName;
}

/**
 * Gemini APIを呼び出し、レスポンスを返す
 * @param {string} prompt - Geminiに送信するプロンプト
 * @param {GoogleAppsScript.Base.Blob} pdfBlob - 解析対象のPDFファイルのBlob
 * @returns {Object|null} Geminiからのレスポンス（JSONオブジェクト）、またはエラーの場合はnull
 */
function callGeminiApi(prompt, pdfBlob) {
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    console.error('エラー: スクリプトプロパティ「GEMINI_API_KEY」が設定されていません。');
    return null;
  }

  try {
    const modelName = getGeminiModelNameFromSpreadsheet();
    if (!modelName) {
      // getGeminiModelNameFromSpreadsheet内でエラーログは出ているので、ここでは何もしない
      return null;
    }

    const pdfBytes = pdfBlob.getBytes();
    const pdfBase64 = Utilities.base64Encode(pdfBytes);

    const requestBody = {
      "contents": [
        {
          "parts": [
            { "text": prompt },
            {
              "inline_data": {
                "mime_type": "application/pdf",
                "data": pdfBase64
              }
            }
          ]
        }
      ]
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(requestBody),
      'muteHttpExceptions': true // エラー時に例外をスローさせない
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      return JSON.parse(responseBody);
    } else {
      console.error(`Gemini APIの呼び出しに失敗しました。ステータスコード: ${responseCode}`);
      console.error(`レスポンス: ${responseBody}`);
      return null;
    }

  } catch (e) {
    console.error(`Gemini APIの呼び出し中にエラーが発生しました: ${e.message}`);
    console.error(`スタックトレース: ${e.stack}`);
    return null;
  }
}
