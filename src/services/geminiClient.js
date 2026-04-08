/**
 * Gemini APIを呼び出すためのクライアント
 */

/**
 * Gemini API (Vertex AI) を呼び出し、レスポンスを返す
 * @param {string} prompt - Geminiに送信するプロンプト
 * @param {GoogleAppsScript.Base.Blob} pdfBlob - 解析対象のPDFファイルのBlob
 * @param {string} modelName - 使用するGeminiのモデル名
 * @returns {Object|null} Geminiからのレスポンス（JSONオブジェクト）、またはエラーの場合はnull
 */
function callGeminiApi(prompt, pdfBlob, modelName) {
  const logger = getContextLogger('callGeminiApi');

  try {
    const pm = getPropertyManager();
    const projectId = pm.getVertexAiProjectId();
    const location = pm.getVertexAiLocation();
    const accessToken = ScriptApp.getOAuthToken();

    if (!modelName) {
      logger.error('エラー: モデル名が指定されていません。');
      return null;
    }

    const pdfBytes = pdfBlob.getBytes();
    const pdfBase64 = Utilities.base64Encode(pdfBytes);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: MIME_TYPES.PDF,
                data: pdfBase64,
              },
            },
          ],
        },
      ],
    };

    const options = {
      method: HTTP_METHODS.POST,
      contentType: HTTP_CONTENT_TYPES.JSON,
      payload: JSON.stringify(requestBody),
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      muteHttpExceptions: true, // エラー時に例外をスローさせない
    };

    // Vertex AI REST API URL
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:streamGenerateContent`;
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const parsedResponse = JSON.parse(responseBody);
      // streamGenerateContent の場合は配列で返ってくるため、最初の要素を取得
      if (Array.isArray(parsedResponse)) {
        return parsedResponse[0];
      }
      return parsedResponse;
    } else {
      logger.error(`Gemini API (Vertex AI) の呼び出しに失敗しました。ステータスコード: ${responseCode}`);
      logger.error(`レスポンス: ${responseBody}`);
      return null;
    }
  } catch (e) {
    handleError(e, 'callGeminiApi');
    return null;
  }
}
