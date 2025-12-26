/**
 * PDFファイルを解析し、情報を抽出するサービス
 */

/**
 * Gemini APIを使用してPDFを解析し、JSONとして結果を返す汎用関数
 * @param {GoogleAppsScript.Base.Blob} pdfBlob - 解析対象のPDFファイルのBlob
 * @param {string} prompt - 解析に使用するプロンプト
 * @param {string} modelName - 使用するGeminiのモデル名
 * @returns {Object|null} 解析結果のJSONオブジェクト、またはエラー時はnull
 */
function parsePdfWithGemini(pdfBlob, prompt, modelName) {
  const logger = getContextLogger('parsePdfWithGemini');

  try {
    const geminiResponse = callGeminiApi(prompt, pdfBlob, modelName);

    if (geminiResponse && geminiResponse.candidates && geminiResponse.candidates.length > 0) {
      const content = geminiResponse.candidates[0].content.parts[0].text;
      
      // JSONブロックの抽出（Markdownの除去だけでなく、テキスト内のJSONブロックを探す）
      // 1. ```json ... ``` のパターン
      let jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // 2. もし全体がJSONでなければ、{ ... } を探す（invoiceProcessorのロジックを取り込み）
      const jsonMatch = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      try {
        return JSON.parse(jsonString);
      } catch (parseError) {
        logger.error('JSONパースエラー:', parseError);
        logger.debug('抽出されたテキスト:', jsonString);
        return null;
      }
    } else {
      logger.error('Geminiからの有効なレスポンスが得られませんでした。');
      return null;
    }
  } catch (e) {
    handleError(e, 'parsePdfWithGemini');
    return null;
  }
}

/**
 * PDFファイルからメニュー情報を解析して抽出する（メニュー解析専用のラッパー）
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

    const menuData = parsePdfWithGemini(pdfBlob, prompt, modelName);

    if (menuData) {
      // parsePdfMenuは元々Result型を返していたので、それに合わせる
      return Result.success(menuData, `${Array.isArray(menuData) ? menuData.length : 1}件のデータを抽出しました`);
    } else {
      return Result.failure('メニュー解析に失敗しました。');
    }
  } catch (e) {
    handleError(e, 'parsePdfMenu');
    return Result.failure(e);
  }
}
