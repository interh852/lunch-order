/**
 * Gemini APIを呼び出すためのクライアント
 */

/**
 * Gemini APIを呼び出し、レスポンスを返す
 * @param {string} prompt - Geminiに送信するプロンプト
 * @param {GoogleAppsScript.Base.Blob} pdfBlob - 解析対象のPDFファイルのBlob
 * @param {string} modelName - 使用するGeminiのモデル名
 * @returns {Object|null} Geminiからのレスポンス（JSONオブジェクト）、またはエラーの場合はnull
 */
function callGeminiApi(prompt, pdfBlob, modelName) {
  const logger = getContextLogger('callGeminiApi');
  
  try {
    const propertyManager = getPropertyManager();
    const apiKey = propertyManager.getGeminiApiKey();

    if (!modelName) {
      logger.error('エラー: モデル名が指定されていません。');
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
                "mime_type": MIME_TYPES.PDF,
                "data": pdfBase64
              }
            }
          ]
        }
      ]
    };

    const options = {
      'method': HTTP_METHODS.POST,
      'contentType': HTTP_CONTENT_TYPES.JSON,
      'payload': JSON.stringify(requestBody),
      'muteHttpExceptions': true // エラー時に例外をスローさせない
    };

    const url = `${API_ENDPOINTS.GEMINI_BASE_URL}/${modelName}:generateContent?key=${apiKey}`;
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      return JSON.parse(responseBody);
    } else {
      logger.error(`Gemini APIの呼び出しに失敗しました。ステータスコード: ${responseCode}`);
      logger.error(`レスポンス: ${responseBody}`);
      return null;
    }

  } catch (e) {
    handleError(e, 'callGeminiApi');
    return null;
  }
}
