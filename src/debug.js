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

  if (result.valid) {
    logger.info('✅ 設定は正常です。すべての必須項目が設定されています。');
  } else {
    logger.error('❌ 設定にエラーがあります:');
    result.errors.forEach((error) => {
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

    // テスト用の簡単なプロンプトと、最小限の有効なPDFバイナリ（1x1ピクセルの空白ページ相当）
    const testPrompt = "Hello! Please respond with 'OK' if you can read this message.";
    // 最小限のPDF構造を持つBase64データ
    const minPdfBase64 = 'JVBERi0xLjAKMSAwIG9iajw8L1BhZ2VzIDIgMCBSPj5lbmRvYmogMiAwIG9iajw8L0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iaiAzIDAgb2JqPDwvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCAzIDNdPj5lbmRvYmoKdHJhaWxlcjw8L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKOTIKJSVFT0Y=';
    const pdfBytes = Utilities.base64Decode(minPdfBase64);
    const testBlob = Utilities.newBlob(pdfBytes, 'application/pdf', 'test.pdf');

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
 * 次回の注文募集アナウンスのテスト
 * 実際にSlackに投稿して動作確認を行います
 */
function testOrderAnnouncement() {
  const logger = getContextLogger('testOrderAnnouncement');
  logger.info('=== 注文募集アナウンステスト開始 ===');

  try {
    announceNextWeekOrderToSlack();
    logger.info('=== テスト完了 ===');
  } catch (e) {
    handleError(e, 'testOrderAnnouncement');
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
    logger.info(
      `  スプレッドシートID: ${spreadsheetId ? spreadsheetId.substring(0, 10) + '...' : '未設定'}`
    );

    const menuFolderId = propertyManager.getMenuFolderId();
    logger.info(
      `  メニューフォルダID: ${menuFolderId ? menuFolderId.substring(0, 10) + '...' : '未設定'}`
    );

    const orderCardFolderId = propertyManager.getOrderCardFolderId();
    logger.info(
      `  オーダーカードフォルダID: ${orderCardFolderId ? orderCardFolderId.substring(0, 10) + '...' : '未設定'}`
    );

    const apiKey = propertyManager.getGeminiApiKey();
    logger.info(
      `  Gemini API Key: ${apiKey ? '設定済み (***' + apiKey.substring(apiKey.length - 4) + ')' : '未設定'}`
    );

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
 * オーダーカードのレイアウト変更（ご飯なし対応）のテスト
 * 2週目以降の書き込み位置が正しいか検証します
 */
function testOrderCardLayout() {
  const logger = getContextLogger('testOrderCardLayout');
  logger.info('=== オーダーカードレイアウトテスト開始 ===');
  
  const failures = [];

  // 定数の確認
  logger.info(`現在の ROWS_PER_WEEK: ${ORDER_CARD_LAYOUT.ROWS_PER_WEEK}`);

  // 1週目の開始行（変化なしの想定）
  const week1_expected = ORDER_CARD_LAYOUT.FIRST_WEEK_BASE_ROW;
  const week1_actual = ORDER_CARD_LAYOUT.FIRST_WEEK_BASE_ROW + (1 - 1) * ORDER_CARD_LAYOUT.ROWS_PER_WEEK;
  
  if (week1_actual !== week1_expected) {
    failures.push(`1週目計算エラー: expected=${week1_expected}, actual=${week1_actual}`);
  }

  // 2週目の開始行の検証
  // 1週目(8行目) + 5行間隔 = 13行目になるべき
  const week2_expected = 13;
  const week2_actual = ORDER_CARD_LAYOUT.FIRST_WEEK_BASE_ROW + (2 - 1) * ORDER_CARD_LAYOUT.ROWS_PER_WEEK;

  if (week2_actual !== week2_expected) {
    failures.push(`2週目計算エラー (行ズレ): expected=${week2_expected}, actual=${week2_actual} (現在の設定値による計算結果)`);
  }

  if (failures.length > 0) {
    logger.error('❌ テスト失敗:\n' + failures.join('\n'));
    // 意図的に失敗させているので、ここでプロセスを終了させず、ログ出力のみとする
  } else {
    logger.info('✅ 全テスト通過');
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
    '5. スプレッドシートアクセス': false,
  };

  try {
    // 1. 設定バリデーション
    logger.info('\n--- 1/5: 設定バリデーション ---');
    const configResult = checkConfiguration();
    results['1. 設定バリデーション'] = configResult && configResult.valid;

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

// ========================================
// スナップショット関連のデバッグ関数
// ========================================

/**
 * スナップショットシートの内容を一覧表示（デバッグ用）
 */
function debugListSnapshots() {
  const logger = getContextLogger('debugListSnapshots');
  logger.info('=== スナップショット一覧 ===');

  try {
    const sheet = getOrCreateSnapshotSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      logger.info('📭 スナップショットは保存されていません。');
      return;
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    // 期間キーごとにグループ化
    const grouped = {};
    data.forEach((row) => {
      const periodKey = row[0];
      if (!grouped[periodKey]) {
        grouped[periodKey] = [];
      }
      grouped[periodKey].push({
        date: formatDateToString(row[1]),
        name: row[2],
        size: row[3],
        savedAt: row[4],
      });
    });

    // 一覧表示
    Object.keys(grouped).forEach((periodKey) => {
      const orders = grouped[periodKey];
      logger.info(`\n📅 期間: ${periodKey} (${orders.length}件)`);
      logger.info(`   保存日時: ${orders[0].savedAt}`);

      // 日付ごとにグループ化して表示
      const byDate = {};
      orders.forEach((order) => {
        if (!byDate[order.date]) {
          byDate[order.date] = [];
        }
        byDate[order.date].push(order);
      });

      Object.keys(byDate)
        .sort()
        .forEach((date) => {
          const dateOrders = byDate[date];
          logger.info(`   ${date}: ${dateOrders.length}件`);
          dateOrders.forEach((order) => {
            logger.info(`     - ${order.name} (${order.size})`);
          });
        });
    });

    logger.info('\n=== 一覧完了 ===');
  } catch (e) {
    handleError(e, 'debugListSnapshots');
  }
}

/**
 * スナップショットの保存テスト（デバッグ用）
 */
function debugSaveSnapshot() {
  const logger = getContextLogger('debugSaveSnapshot');
  logger.info('=== スナップショット保存テスト ===');

  try {
    // テストデータを作成
    const testOrders = [
      { date: '2025/12/16', name: '山田太郎', size: 'M' },
      { date: '2025/12/16', name: '佐藤花子', size: 'L' },
      { date: '2025/12/17', name: '山田太郎', size: 'M' },
      { date: '2025/12/17', name: '鈴木一郎', size: 'S' },
    ];

    // 期間キーを生成（年を含む）
    const periodKey = generatePeriodKey('2025/12/16', '2025/12/17');

    logger.info(`テストデータ: ${testOrders.length}件`);
    logger.info(`期間キー: ${periodKey}`);

    // 保存実行
    saveOrderSnapshot(periodKey, testOrders);

    logger.info('✅ 保存完了！');
    logger.info('debugListSnapshots()で確認してください。');
  } catch (e) {
    handleError(e, 'debugSaveSnapshot');
  }
}

/**
 * スナップショットの読み込みテスト（デバッグ用）
 */
function debugLoadSnapshot() {
  const logger = getContextLogger('debugLoadSnapshot');
  logger.info('=== スナップショット読み込みテスト ===');

  try {
    // テスト用の期間キーを生成（年を含む）
    const periodKey = generatePeriodKey('2025/12/16', '2025/12/17');

    logger.info(`期間キー: ${periodKey}`);

    const orders = loadOrderSnapshot(periodKey);

    if (!orders) {
      logger.warn('❌ スナップショットが見つかりませんでした。');
      logger.info('debugListSnapshots()で存在する期間キーを確認してください。');
      return;
    }

    logger.info(`✅ 読み込み成功！ ${orders.length}件`);
    orders.forEach((order) => {
      logger.info(`  - ${order.date} ${order.name} (${order.size})`);
    });
  } catch (e) {
    handleError(e, 'debugLoadSnapshot');
  }
}

// ========================================
// 日付関連のデバッグ関数
// ========================================

/**
 * 今週・次回の平日取得テスト（デバッグ用）
 */
function debugGetWeekdays() {
  const logger = getContextLogger('debugGetWeekdays');
  logger.info('=== 今週・次回の平日取得テスト ===');

  try {
    const today = new Date();
    logger.info(`基準日: ${today.toLocaleDateString('ja-JP')}`);

    // 今週の平日
    const currentWeekdays = getCurrentWeekdays(today);
    logger.info(`\n📅 今週の平日 (${currentWeekdays.length}日):`);
    currentWeekdays.forEach((date) => {
      logger.info(`  - ${date} (${formatJapaneseDateWithDay(date)})`);
    });

    // 次回の平日
    const nextWeekdays = getNextWeekdays(today);
    logger.info(`\n📅 次回の平日 (${nextWeekdays.length}日):`);
    nextWeekdays.forEach((date) => {
      logger.info(`  - ${date} (${formatJapaneseDateWithDay(date)})`);
    });
  } catch (e) {
    handleError(e, 'debugGetWeekdays');
  }
}

// ========================================
// Gmail検索関連のデバッグ関数
// ========================================

/**
 * Gmail検索テスト（デバッグ用）
 */
function debugGmailSearch() {
  const logger = getContextLogger('debugGmailSearch');
  logger.info('=== Gmail検索テスト ===');

  try {
    const today = new Date();

    // 今週のオーダー送信確認
    const currentWeekdays = getCurrentWeekdays(today);
    logger.info(`\n🔍 今週のオーダー送信確認: ${currentWeekdays[0]}〜${currentWeekdays[4]}`);
    const currentSent = hasOrderEmailBeenSent(currentWeekdays[0], currentWeekdays[4]);
    logger.info(currentSent ? '✅ 送信済み' : '❌ 未送信');

    // 次回のオーダー送信確認
    const nextWeekdays = getNextWeekdays(today);
    logger.info(`\n🔍 次回のオーダー送信確認: ${nextWeekdays[0]}〜${nextWeekdays[4]}`);
    const nextSent = hasOrderEmailBeenSent(nextWeekdays[0], nextWeekdays[4]);
    logger.info(nextSent ? '✅ 送信済み' : '❌ 未送信');

    logger.info('\n=== テスト完了 ===');
  } catch (e) {
    handleError(e, 'debugGmailSearch');
  }
}

// ========================================
// 注文変更検知関連のデバッグ関数
// ========================================

/**
 * 差分検知のテスト（デバッグ用）
 */
function debugDetectChanges() {
  const logger = getContextLogger('debugDetectChanges');
  logger.info('=== 注文変更検知テスト ===');

  try {
    const today = new Date();

    // 次回の変更検知をテスト
    const nextWeekdays = getNextWeekdays(today);
    logger.info(`\n📅 対象期間（次回）: ${nextWeekdays[0]}〜${nextWeekdays[4]}`);

    const result = detectChangesForWeek(nextWeekdays, 'next');

    if (!result) {
      logger.info('\n変更なし、または初回実行です。');
      return;
    }

    // 変更内容を表示
    logger.info('\n🔄 変更検知結果:');

    if (result.changes.added.length > 0) {
      logger.info(`\n【追加】 ${result.changes.added.length}件`);
      result.changes.added.forEach((change) => {
        logger.info(`  + ${change.date} ${change.name} (${change.size})`);
      });
    }

    if (result.changes.cancelled.length > 0) {
      logger.info(`\n【キャンセル】 ${result.changes.cancelled.length}件`);
      result.changes.cancelled.forEach((change) => {
        logger.info(`  - ${change.date} ${change.name} (${change.size})`);
      });
    }

    logger.info('\n=== テスト完了 ===');
  } catch (e) {
    handleError(e, 'debugDetectChanges');
  }
}

/**
 * 差分比較ロジックの単体テスト（デバッグ用）
 */
function debugCompareOrders() {
  const logger = getContextLogger('debugCompareOrders');
  logger.info('=== 差分比較ロジックテスト ===');

  try {
    // テストデータ: 前回のスナップショット
    const previousOrders = [
      { date: '2025/12/16', name: '山田太郎', size: '普通' },
      { date: '2025/12/16', name: '佐藤花子', size: '大盛' },
      { date: '2025/12/17', name: '山田太郎', size: '普通' },
      { date: '2025/12/17', name: '鈴木一郎', size: '小盛' },
    ];

    // テストデータ: 現在の注文（変更あり）
    const currentOrders = [
      { date: '2025/12/16', name: '山田太郎', size: 'M' }, // 変更なし（正規化後は「普通」）
      { date: '2025/12/16', name: '田中次郎', size: 'L' }, // 追加
      { date: '2025/12/17', name: '山田太郎', size: 'M' }, // 変更なし
      // 佐藤花子と鈴木一郎がキャンセル
    ];

    logger.info('\n前回のスナップショット:');
    previousOrders.forEach((o) => logger.info(`  - ${o.date} ${o.name} (${o.size})`));

    logger.info('\n現在の注文:');
    currentOrders.forEach((o) => logger.info(`  - ${o.date} ${o.name} (${o.size})`));

    // 差分比較
    const changes = compareOrderSnapshots(previousOrders, currentOrders);

    logger.info('\n📊 検知結果:');
    logger.info(`追加: ${changes.added.length}件`);
    changes.added.forEach((c) => logger.info(`  + ${c.date} ${c.name} (${c.size})`));

    logger.info(`\nキャンセル: ${changes.cancelled.length}件`);
    changes.cancelled.forEach((c) => logger.info(`  - ${c.date} ${c.name} (${c.size})`));

    logger.info('\n=== テスト完了 ===');
  } catch (e) {
    handleError(e, 'debugCompareOrders');
  }
}

/**
 * 通知機能のテスト（デバッグ用）
 */
function debugNotifyChanges() {
  const logger = getContextLogger('debugNotifyChanges');
  logger.info('=== 通知機能テスト ===');

  try {
    // テスト用の変更データを作成
    const testChangeResult = {
      weekType: 'current',
      period: {
        start: '2025/12/16',
        end: '2025/12/20',
      },
      changes: {
        added: [
          { date: '2025/12/16', name: '新入社員A', size: '普通' },
          { date: '2025/12/17', name: '新入社員B', size: '大盛' },
        ],
        cancelled: [
          { date: '2025/12/16', name: '退職者X', size: '普通' },
          { date: '2025/12/17', name: '退職者Y', size: '小盛' },
        ],
      },
    };

    logger.info('\n📊 テストデータ:');
    logger.info(`週タイプ: ${testChangeResult.weekType === 'current' ? '今週' : '次回'}`);
    logger.info(`期間: ${testChangeResult.period.start} - ${testChangeResult.period.end}`);
    logger.info(`追加: ${testChangeResult.changes.added.length}件`);
    logger.info(`キャンセル: ${testChangeResult.changes.cancelled.length}件`);

    // 通知を実行
    logger.info('\n📤 通知を送信中...');
    notifyChanges(testChangeResult);

    logger.info('\n✅ テスト完了！');
    logger.info('- Slackメッセージを確認してください');
    logger.info('- Gmailの下書きを確認してください');
  } catch (e) {
    handleError(e, 'debugNotifyChanges');
  }
}

/**
 * メニュー存在確認のテスト（デバッグ用）
 */
function debugHasMenuForRange() {
  const logger = getContextLogger('debugHasMenuForRange');
  logger.info('=== メニュー存在確認テスト ===');

  try {
    // JSの月は0から始まるため、12月は11を指定する
    const today = new Date(2025, 11, 17);
    logger.info(`基準日: ${today.toLocaleDateString('ja-JP')}`);

    // パターン1: 次回（通常存在するはず）
    const nextWeekdays = getNextWeekdays(today);
    logger.info(
      `\n1. 次回 (${nextWeekdays[0]}〜${nextWeekdays[nextWeekdays.length - 1]}) のチェック:`
    );
    const hasMenuNextWeek = hasMenuForRange(nextWeekdays);
    logger.info(hasMenuNextWeek ? '✅ メニューあり' : '❌ メニューなし');

    // パターン2: 遠い未来（存在しないはず）
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1年後
    const futureWeekdays = getNextWeekdays(futureDate);
    logger.info(
      `\n2. 1年後 (${futureWeekdays[0]}〜${futureWeekdays[futureWeekdays.length - 1]}) のチェック:`
    );
    const hasMenuFuture = hasMenuForRange(futureWeekdays);
    logger.info(hasMenuFuture ? '✅ メニューあり' : '❌ メニューなし (期待通り)');

    logger.info('\n=== テスト完了 ===');
  } catch (e) {
    handleError(e, 'debugHasMenuForRange');
  }
}

/**
    
     * メニューなしの場合の週次注文処理スキップテスト（デバッグ用）
    
     * 
    
     * 注意: このテストを完全に自動化するには、内部の Date を制御する必要がありますが、
    
     * ここでは「メニューがない期間」であることを前提として、
    
     * processWeeklyOrdersAndCreateDraft が正しくスキップするかをログで確認するためのものです。
    
     */

function debugProcessWeeklyOrdersWithNoMenu() {
  const logger = getContextLogger('debugProcessWeeklyOrdersWithNoMenu');

  logger.info('=== 週次注文処理スキップテスト（メニューなし） ===');

  try {
    logger.info(
      '※このテストは、現在の次回（月〜金）のメニューが登録されていない状態で実行してください。'
    );

    logger.info('処理を開始します...');

    processWeeklyOrdersAndCreateDraft();

    logger.info(
      '処理が終了しました。ログを確認して「メニューが登録されていないためスキップ」と出ているか確認してください。'
    );
  } catch (e) {
    handleError(e, 'debugProcessWeeklyOrdersWithNoMenu');
  }
}

/**
 * 請求書処理のテスト（デバッグ用）
 * Gemini APIによる解析テストと、Gmail検索の確認を行います
 */
function testInvoiceProcessing() {
  const logger = getContextLogger('testInvoiceProcessing');
  logger.info('=== 請求書処理テスト開始 ===');

  try {
    const config = getConfig();
    if (!config) {
      logger.error('設定の取得に失敗しました');
      return;
    }

    // 1. Gmail検索テスト
    logger.info(`\n🔍 Gmail検索テスト (クエリ: ${config.gmailQueryInvoice})`);
    const threads = GmailApp.search(config.gmailQueryInvoice);
    logger.info(`ヒット件数: ${threads.length}件`);

    if (threads.length > 0) {
      // 直近30日以内のメッセージを探す
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      let targetMessage = null;
      let targetPdf = null;

      // 最新のスレッドから順に探す
      for (const thread of threads) {
        const messages = thread.getMessages();
        // スレッド内の新しいメッセージから順にチェック
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg.getDate() >= thirtyDaysAgo) {
            const attachments = msg.getAttachments();
            const pdf = attachments.find(a => a.getContentType() === MIME_TYPES.PDF);
            if (pdf) {
              targetMessage = msg;
              targetPdf = pdf;
              break;
            }
          }
        }
        if (targetMessage) break;
      }

      if (targetMessage && targetPdf) {
        logger.info(`最新の対象メール: ${targetMessage.getSubject()} (${targetMessage.getDate()})`);
        logger.info(`\n📄 PDFが見つかりました: ${targetPdf.getName()}`);
        logger.info('Gemini APIで解析を試みます...');
        
        // analyzeInvoicePdfはBlobを引数に取るため、Blobを渡す
        const result = analyzeInvoicePdf(targetPdf.copyBlob());
        if (result) {
          logger.info('✅ 解析成功！');
          logger.info(JSON.stringify(result, null, 2));
        } else {
          logger.error('❌ 解析失敗');
        }
      } else {
        logger.info('⚠️ 直近30日以内にPDF添付付きの対象メールが見つかりませんでした。');
      }
    } else {
      logger.info('⚠️ テスト対象のメールが見つかりませんでした。');
    }

  } catch (e) {
    handleError(e, 'testInvoiceProcessing');
  }
  
  logger.info('\n=== テスト完了 ===');
}

/**
 * 注文履歴集計のテスト（デバッグ用）
 */
function debugAggregateHistory() {
  const logger = getContextLogger('debugAggregateHistory');
  logger.info('=== 注文履歴集計テスト開始 ===');

  try {
    // 現在の月を対象にテスト
    const now = new Date();
    const targetMonth = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM');
    logger.info(`対象月: ${targetMonth}`);

    const result = aggregateOrderHistory(targetMonth);
    if (result) {
      logger.info('✅ 集計成功！');
      logger.info(JSON.stringify(result, null, 2));
    } else {
      logger.error('❌ 集計失敗');
    }
  } catch (e) {
    handleError(e, 'debugAggregateHistory');
  }
}

/**
 * 照合・通知フローのテスト（デバッグ用）
 * @param {Object} mockInvoiceData 擬似的な請求書データ（省略時はテスト用データを使用）
 */
function debugReconcileInvoice(mockInvoiceData) {
  const logger = getContextLogger('debugReconcileInvoice');
  logger.info('=== 照合・通知フローテスト開始 ===');

  try {
    const now = new Date();
    const targetMonth = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM');
    
    // データがない場合は、現在のシステム集計結果をベースに「一致」するデータを作成
    let invoiceData = mockInvoiceData;
    if (!invoiceData) {
      const system = aggregateOrderHistory(targetMonth);
      invoiceData = {
        targetMonth: targetMonth,
        countLarge: system.countLarge,
        countRegular: system.countRegular,
        countSmall: system.countSmall,
        totalCount: system.totalCount,
        unitPrice: system.unitPrice,
        totalAmount: system.totalAmount
      };
      logger.info('システム集計結果に合わせて「一致」するダミーデータを作成しました。');
    }

    // ダミーのPDFファイル（Blob）
    const dummyBlob = Utilities.newBlob('dummy pdf content', 'application/pdf', 'test_invoice.pdf');
    const mockPdfFile = {
      getBlob: () => dummyBlob,
      getName: () => 'test_invoice.pdf',
      getUrl: () => 'https://example.com/dummy-pdf'
    };

    logger.info('照合処理を実行中...');
    reconcileAndProcessInvoice(invoiceData, mockPdfFile);
    
    logger.info('✅ テスト完了！ SlackやGmail下書きを確認してください。');

    // 「不一致」パターンもテストしたい場合は、金額を少し変えて再度実行
    logger.info('\n--- 不一致パターンのテスト ---');
    invoiceData.totalAmount += 1000; // 金額をわざとズラす
    reconcileAndProcessInvoice(invoiceData, mockPdfFile);

  } catch (e) {
    handleError(e, 'debugReconcileInvoice');
  }
}

/**
 * Gmail下書き作成機能のテスト（デバッグ用）
 * 宛名の生成ロジックや添付ファイルの確認を行います
 */
function debugGmailDraftCreator() {
  const logger = getContextLogger('debugGmailDraftCreator');
  logger.info('=== Gmail下書き作成テスト開始 ===');

  try {
    const propertyManager = getPropertyManager();
    const config = getConfig();

    // 1. 注文変更メールのテスト
    logger.info('\n--- 1. 注文変更メールのテスト ---');
    
    // テスト用の固定日付 (2025/12/18)
    const testDate = new Date(2025, 11, 18); // JSの月は0から始まるため11=12月
    const period = {
      start: Utilities.formatDate(testDate, Session.getScriptTimeZone(), 'yyyy/MM/dd'),
      end: Utilities.formatDate(testDate, Session.getScriptTimeZone(), 'yyyy/MM/dd')
    };

    logger.info(`期間: ${period.start} - ${period.end}`);
    logger.info(`宛先: ${config.lunchProviderEmail}`);


    const changes = {
      added: [{ date: period.start, name: 'テスト太郎', size: '普通' }],
      cancelled: [],
      quantityChanges: []
    };

    // 下書き作成（宛先アドレスのローカルパートが宛名に使われてしまうか確認）
    // ※本来は店名が取得できるべきだが、データがない場合はどうなるか
    const changeDraft = createOrderChangeEmailDraft(config.lunchProviderEmail, period, changes, [], 'next');
    if (changeDraft) {
      logger.info(`✅ 下書き作成成功: ID=${changeDraft.getId()}`);
      // 本文の内容をログに出せないため、Gmailで直接確認する必要があります
      logger.info('Gmailの下書きフォルダを確認し、宛名が「〇〇弁当様」になっているか確認してください。');
    } else {
      logger.error('❌ 下書き作成失敗');
    }

    // 2. 請求書申請メールのテスト
    logger.info('\n--- 2. 請求書申請メールのテスト ---');
    
    const invoiceData = {
      targetMonth: '2025/11',
      totalCount: 100,
      totalAmount: 50000
    };
    
    const dummyBlob = Utilities.newBlob('dummy pdf content', 'application/pdf', 'test_invoice.pdf');
    const recipientEmail = config.generalAffairs.email;
    const recipientName = config.generalAffairs.name;

    logger.info(`宛先: ${recipientName} <${recipientEmail}>`);

    const invoiceDraft = createInvoiceEmailDraft(recipientEmail, invoiceData, dummyBlob, recipientName);
    
    if (invoiceDraft) {
      logger.info(`✅ 下書き作成成功: ID=${invoiceDraft.getId()}`);
      logger.info('Gmailの下書きフォルダを確認し、以下の点を確認してください：');
      logger.info('  1. 宛名の敬称が「さん」になっているか');
      logger.info('  2. 差出人が正しく設定されているか');
      logger.info('  3. PDFファイルが添付されているか');
    } else {
      logger.error('❌ 下書き作成失敗');
    }

  } catch (e) {
    handleError(e, 'debugGmailDraftCreator');
  }

  logger.info('\n=== テスト完了 ===');
}

/**
 * 2026年2月の新価格体系を想定した集計テスト
 * 🔴 RED: 現在のロジックではサイズ別の新価格に対応していないことを確認します
 */
function testNewPriceCalculation() {
  const logger = getContextLogger('testNewPriceCalculation');
  logger.info('=== 新価格体系集計テスト開始 (🔴 RED) ===');

  try {
    const targetMonth = '2026/02';
    logger.info(`テスト対象月: ${targetMonth}`);

    // 現在の集計ロジックを実行
    // ※注意: 実際にシートにデータがないと結果は0になりますが、
    // ロジック的にサイズ別の単価を持っていないことを示すのが目的です。
    const result = aggregateOrderHistory(targetMonth);

    if (!result) {
      logger.error('❌ 集計に失敗しました');
      return;
    }

    logger.info('【現在の集計結果】');
    logger.info(JSON.stringify(result, null, 2));

    logger.info('\n--- 検証ポイント ---');
    logger.info('1. サイズごとに異なる単価が適用されているか？');
    // 現在の totalAmount は totalCount * unitPrice (共通単価) で計算されている
    // 新体系ではサイズごとに単価が違うため、この計算式自体が変わる必要がある
    logger.info(`現在の計算方法: ${result.totalCount}個 × 共通単価${result.unitPrice}円 = ${result.totalAmount}円`);
    logger.info('⚠️ 2026/02以降は、サイズ（小・中・大）ごとに単価が異なるため、この計算は正しくありません。');

    // 理想的な結果（サイズ別の単価があるべき）とのギャップを示す
    if (result.unitPriceLarge === undefined) {
      logger.error('❌ 失敗: 集計結果にサイズ別の単価（unitPriceLarge等）が含まれていません。');
    }

  } catch (e) {
    handleError(e, 'testNewPriceCalculation');
  }
}

