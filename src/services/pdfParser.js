/**
 * PDFファイルを解析し、メニュー情報を抽出する
 */

/**
 * PDFファイルからメニュー情報を解析して抽出する
 * @param {GoogleAppsScript.Drive.File} pdfFile - 解析対象のPDFファイル
 * @returns {Object} Result型のオブジェクト（成功時はdataにメニュー配列）
 */
function parsePdfMenu(pdfFile) {
  const logger = getContextLogger('parsePdfMenu');

  try {
    const config = getConfig();
    if (!config) {
      const error = '設定を取得できませんでした。';
      logger.error(error);
      return Result.failure(error);
    }

    const { prompt, modelName } = config;
    const pdfBlob = pdfFile.getBlob();

    const geminiResponse = callGeminiApi(prompt, pdfBlob, modelName);

    if (geminiResponse && geminiResponse.candidates && geminiResponse.candidates.length > 0) {
      const content = geminiResponse.candidates[0].content.parts[0].text;
      // GeminiからのレスポンスはJSONがマークダウンブロックに囲まれている場合があるため、それを取り除く
      const jsonString = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const menuData = JSON.parse(jsonString);
      return Result.success(menuData, `${menuData.length}件のメニューを抽出しました`);
    } else {
      const error = 'Geminiからの有効なレスポンスが得られませんでした。';
      logger.error(error);
      return Result.failure(error, geminiResponse);
    }
  } catch (e) {
    handleError(e, 'parsePdfMenu');
    return Result.failure(e);
  }
}
