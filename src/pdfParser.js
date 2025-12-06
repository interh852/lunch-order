/**
 * PDFファイルを解析し、メニュー情報を抽出する
 */

/**
 * PDFファイルからメニュー情報を解析して抽出する
 * @param {GoogleAppsScript.Drive.File} pdfFile - 解析対象のPDFファイル
 * @returns {Array<{date: string, menu: string}>|null} 抽出されたメニュー情報の配列、またはエラーの場合はnull
 */
function parsePdfMenu(pdfFile) {
  try {
    const config = getConfigFromSpreadsheet();
    if (!config) {
      console.error('スプレッドシートから設定を取得できませんでした。');
      return null;
    }
    
    const { prompt, modelName } = config;
    const pdfBlob = pdfFile.getBlob();
    
    const geminiResponse = callGeminiApi(prompt, pdfBlob, modelName);

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
