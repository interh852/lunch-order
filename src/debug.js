/**
 * デバッグ・テスト用の関数群
 * スクリプトエディタから手動実行して各機能の動作確認を行うことができます
 */

/**
 * 設定のバリデーションを実行する
 * スクリプトエディタから手動実行して設定の確認を行うことができます
 */
function checkConfiguration() {
  const logger = getContextLogger('checkConfiguration');
  logger.info('=== 設定のバリデーションを開始します ===');
  
  const result = validateConfiguration();
  
  if (result.isValid) {
    logger.info('✅ 設定は正常です。すべての必須項目が設定されています。');
  } else {
    logger.error('❌ 設定にエラーがあります:');
    result.errors.forEach(error => {
      logger.error(`  - ${error}`);
    });
  }
  
  logger.info('=== バリデーション完了 ===');
  return result;
}

/**
 * Gmail検索機能のテスト
 * 設定されたクエリで実際にメールを検索し、件数を確認します
 */
function testGmailSearch() {
  const logger = getContextLogger('testGmailSearch');
  logger.info('=== Gmail検索テスト開始 ===');
  
  try {
    const config = getConfig();
    if (!config) {
      logger.error('設定の取得に失敗しました');
      return null;
    }
    
    logger.info(`検索クエリ: ${config.gmailQuery}`);
    const threads = GmailApp.search(config.gmailQuery);
    logger.info(`✅ 検索結果: ${threads.length}件のスレッド`);
    
    if (threads.length > 0) {
      logger.info('最新スレッドの情報:');
      const latestThread = threads[0];
      const messages = latestThread.getMessages();
      logger.info(`  - 件名: ${messages[0].getSubject()}`);
      logger.info(`  - 日付: ${messages[0].getDate()}`);
      logger.info(`  - メッセージ数: ${messages.length}`);
    }
    
    return threads.length;
  } catch (e) {
    handleError(e, 'testGmailSearch');
    return null;
  }
}

/**
 * Gemini API接続テスト
 * ダミーのデータでGemini APIとの接続を確認します
 */
function testGeminiConnection() {
  const logger = getContextLogger('testGeminiConnection');
  logger.info('=== Gemini API接続テスト開始 ===');
  
  try {
    const config = getConfig();
    if (!config) {
      logger.error('設定の取得に失敗しました');
      return null;
    }
    
    // テスト用の簡単なプロンプトとダミーPDFで接続確認
    const testPrompt = "Hello! Please respond with 'OK' if you can read this message.";
    const testBlob = Utilities.newBlob("test content", "text/plain", "test.txt");
    
    logger.info('Gemini APIを呼び出し中...');
    const result = callGeminiApi(testPrompt, testBlob, config.modelName);
    
    if (result) {
      logger.info('✅ Gemini API接続成功');
      logger.debug('レスポンス:', JSON.stringify(result, null, 2));
      return true;
    } else {
      logger.error('❌ Gemini API接続失敗');
      return false;
    }
  } catch (e) {
    handleError(e, 'testGeminiConnection');
    return false;
  }
}

/**
 * Slack通知機能のテスト
 * テストメッセージをSlackに送信します
 */
function testSlackNotification() {
  const logger = getContextLogger('testSlackNotification');
  logger.info('=== Slack通知テスト開始 ===');
  
  try {
    const config = getConfig();
    if (!config) {
      logger.error('設定の取得に失敗しました');
      return null;
    }
    
    const testMessage = '🧪 *テストメッセージ*\n\nこれはGoogle Apps Scriptからの接続テストです。';
    logger.info('Slackにテストメッセージを送信中...');
    
    const result = sendToSlack(testMessage, config.slack.botToken, config.slack.channelId);
    
    if (Result.isSuccess(result)) {
      logger.info('✅ Slack通知成功');
      logger.info(`チャンネルID: ${result.data.channelId}`);
      logger.info(`タイムスタンプ: ${result.data.timestamp}`);
      return true;
    } else {
      logger.error('❌ Slack通知失敗');
      logger.error(`エラー: ${result.error}`);
      return false;
    }
  } catch (e) {
    handleError(e, 'testSlackNotification');
    return false;
  }
}

/**
 * スプレッドシート読み書き機能のテスト
 * 注文履歴シートからデータを読み込んでテストします
 */
function testSpreadsheetAccess() {
  const logger = getContextLogger('testSpreadsheetAccess');
  logger.info('=== スプレッドシート読み書きテスト開始 ===');
  
  try {
    const service = getSpreadsheetService();
    
    // 注文履歴シートの読み込みテスト
    logger.info('注文履歴シートを読み込み中...');
    const readResult = service.readData(ORDER_HISTORY_SHEET_NAME);
    
    if (Result.isSuccess(readResult)) {
      logger.info('✅ スプレッドシート読み込み成功');
      logger.info(`データ行数: ${readResult.data.length}行`);
      
      if (readResult.data.length > 1) {
        logger.debug('最初のデータ行:', JSON.stringify(readResult.data[1]));
      }
      return true;
    } else {
      logger.error('❌ スプレッドシート読み込み失敗');
      logger.error(`エラー: ${readResult.error}`);
      return false;
    }
  } catch (e) {
    handleError(e, 'testSpreadsheetAccess');
    return false;
  }
}

/**
 * 環境情報を一覧表示
 * スクリプトプロパティと設定値を確認します（機密情報は一部マスク）
 */
function showEnvironmentInfo() {
  const logger = getContextLogger('showEnvironmentInfo');
  logger.info('=== 環境情報 ===');
  
  try {
    const propertyManager = getPropertyManager();
    
    // スクリプトプロパティ
    logger.info('【スクリプトプロパティ】');
    const spreadsheetId = propertyManager.getSpreadsheetId();
    logger.info(`  スプレッドシートID: ${spreadsheetId ? spreadsheetId.substring(0, 10) + '...' : '未設定'}`);
    
    const menuFolderId = propertyManager.getMenuFolderId();
    logger.info(`  メニューフォルダID: ${menuFolderId ? menuFolderId.substring(0, 10) + '...' : '未設定'}`);
    
    const orderCardFolderId = propertyManager.getOrderCardFolderId();
    logger.info(`  オーダーカードフォルダID: ${orderCardFolderId ? orderCardFolderId.substring(0, 10) + '...' : '未設定'}`);
    
    const apiKey = propertyManager.getGeminiApiKey();
    logger.info(`  Gemini API Key: ${apiKey ? '設定済み (***' + apiKey.substring(apiKey.length - 4) + ')' : '未設定'}`);
    
    // 設定値
    logger.info('【スプレッドシートからの設定値】');
    const config = getConfig();
    if (config) {
      logger.info(`  Geminiモデル名: ${config.modelName}`);
      logger.info(`  Gmailクエリ: ${config.gmailQuery}`);
      logger.info(`  Slackボットトークン: ${config.slack.botToken ? '設定済み' : '未設定'}`);
      logger.info(`  SlackチャンネルID: ${config.slack.channelId}`);
      logger.info(`  プロンプト長: ${config.prompt ? config.prompt.length + '文字' : '未設定'}`);
    } else {
      logger.error('  設定の取得に失敗しました');
    }
    
    logger.info('================');
  } catch (e) {
    handleError(e, 'showEnvironmentInfo');
  }
}

/**
 * すべての機能の動作確認を実行
 * 各テスト関数を順番に実行し、結果をまとめて表示します
 */
function runAllTests() {
  const logger = getContextLogger('runAllTests');
  logger.info('╔══════════════════════════════════════╗');
  logger.info('║   全機能統合テスト開始               ║');
  logger.info('╚══════════════════════════════════════╝');
  
  const results = {
    '1. 設定バリデーション': false,
    '2. Gmail検索': false,
    '3. Gemini API接続': false,
    '4. Slack通知': false,
    '5. スプレッドシートアクセス': false
  };
  
  try {
    // 1. 設定バリデーション
    logger.info('\n--- 1/5: 設定バリデーション ---');
    const configResult = checkConfiguration();
    results['1. 設定バリデーション'] = configResult && configResult.isValid;
    
    // 2. Gmail検索テスト
    logger.info('\n--- 2/5: Gmail検索テスト ---');
    const gmailResult = testGmailSearch();
    results['2. Gmail検索'] = gmailResult !== null;
    
    // 3. Gemini API接続テスト
    logger.info('\n--- 3/5: Gemini API接続テスト ---');
    const geminiResult = testGeminiConnection();
    results['3. Gemini API接続'] = geminiResult === true;
    
    // 4. Slack通知テスト
    logger.info('\n--- 4/5: Slack通知テスト ---');
    const slackResult = testSlackNotification();
    results['4. Slack通知'] = slackResult === true;
    
    // 5. スプレッドシートアクセステスト
    logger.info('\n--- 5/5: スプレッドシートアクセステスト ---');
    const spreadsheetResult = testSpreadsheetAccess();
    results['5. スプレッドシートアクセス'] = spreadsheetResult === true;
    
  } catch (e) {
    handleError(e, 'runAllTests');
  }
  
  // 結果サマリー
  logger.info('\n╔══════════════════════════════════════╗');
  logger.info('║   テスト結果サマリー                 ║');
  logger.info('╚══════════════════════════════════════╝');
  
  let passCount = 0;
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    logger.info(`${status} ${name}`);
    if (passed) passCount++;
  });
  
  logger.info('');
  logger.info(`合計: ${passCount}/${Object.keys(results).length} テスト成功`);
  logger.info('══════════════════════════════════════');
  
  return results;
}
