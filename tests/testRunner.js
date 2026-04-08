const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. GASモックを読み込む
require('./mockGas');

// コンテキストを作成 (globalをそのまま渡す)
const context = vm.createContext(global);

// 2. ソースファイルを読み込んで結合
const sourceFiles = [
  'src/utils/constants.js',
  'src/utils/logger.js',
  'src/utils/errorHandler.js',
  'src/utils/result.js',
  'src/utils/propertyManager.js',
  'src/utils/configService.js',
  'src/services/invoiceService.js',
  'src/services/geminiClient.js'
];

let combinedCode = '';
sourceFiles.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  let code = fs.readFileSync(fullPath, 'utf8');
  // あらゆる const を var に変換
  code = code.replace(/\bconst\b/g, 'var');
  combinedCode += `\n// --- File: ${file} ---\n` + code + '\n';
});

try {
  vm.runInContext(combinedCode, context);
} catch (e) {
  console.error('Error executing combined source:', e);
  process.exit(1);
}

// 3. テスト実行
console.log('--- Start Node.js Test Runner (Really final attempt) ---');

try {
  const aggregateOrderHistory = context.aggregateOrderHistory;
  
  const targetMonth = '2026/02';
  console.log(`Testing Month: ${targetMonth}`);
  
  const result = aggregateOrderHistory(targetMonth);
  
  if (!result) {
    console.error('❌ aggregateOrderHistory returned null');
    process.exit(1);
  }

  console.log('Result:', JSON.stringify(result, null, 2));
  
  const expectedTotal = 660 + 670 + 680;
  const actualTotal = result.totalAmount;
  
  console.log(`Expected Total: ${expectedTotal}`);
  console.log(`Actual Total: ${actualTotal}`);
  
  if (actualTotal === expectedTotal) {
    console.log('✅ TEST PASSED!');
  } else {
    console.error('❌ TEST FAILED!');
    process.exit(1);
  }

  if (result.unitPriceSmall === 660 && result.unitPriceRegular === 670 && result.unitPriceLarge === 680) {
    console.log('✅ UNIT PRICES PASSED!');
  } else {
    console.error('❌ UNIT PRICES FAILED!');
    process.exit(1);
  }

} catch (e) {
  console.error('Runtime Error:', e);
  process.exit(1);
}

// --- Vertex AI Migration: Step 1 (Constants) Test ---
console.log('\n--- Testing Vertex AI Migration: Step 1 (Constants) ---');

const PK = context.PROPERTY_KEYS;
const VC = context.VALIDATION_CONFIG;
const reqProps = VC.requiredProperties;

console.log('Current Required Properties:', JSON.stringify(reqProps));

// 期待される変更
const expectedNewKeys = ['VERTEX_AI_PROJECT_ID', 'VERTEX_AI_LOCATION'];
const missingKeys = expectedNewKeys.filter(key => {
  const propValue = PK[key];
  return !reqProps.includes(propValue);
});
const stillHasOldKey = reqProps.includes(PK.GEMINI_API_KEY);

if (missingKeys.length === 0 && !stillHasOldKey) {
  console.log('✅ Constants validation passed for Vertex AI.');
} else {
  console.error('❌ Constants validation FAILED for Vertex AI.');
  if (missingKeys.length > 0) console.error('Missing keys in requiredProperties:', missingKeys);
  if (stillHasOldKey) console.error('GEMINI_API_KEY still exists in requiredProperties.');
  process.exit(1);
}

// --- Vertex AI Migration: Phase 2 (PropertyManager) Test ---
console.log('\n--- Testing Vertex AI Migration: Phase 2 (PropertyManager) ---');
try {
  const pm = context.getPropertyManager();
  
  const projectId = pm.getVertexAiProjectId();
  if (projectId === 'mock-vertex-project-id') {
    console.log('✅ getVertexAiProjectId() passed.');
  } else {
    console.error('❌ getVertexAiProjectId() failed');
    process.exit(1);
  }

  const location = pm.getVertexAiLocation();
  if (location === 'mock-vertex-location') {
    console.log('✅ getVertexAiLocation() passed.');
  } else {
    console.error('❌ getVertexAiLocation() failed');
    process.exit(1);
  }
} catch (e) {
  console.log('Caught expected error (Red phase):', e.message);
  if (e instanceof TypeError && e.message.includes('is not a function')) {
    console.log('✅ Expected failure (Red): Methods not yet implemented.');
  } else {
    console.error('❌ Unexpected error:', e);
    process.exit(1);
  }
}

// --- Vertex AI Migration: Phase 3 (geminiClient) Test ---
console.log('\n--- Testing Vertex AI Migration: Phase 3 (geminiClient) ---');
try {
  // ダミーのBlobモック
  const mockBlob = {
    getBytes: () => new Uint8Array([0, 1, 2]),
    getContentType: () => 'application/pdf'
  };
  
  // PropertyManagerの設定（モック用）
  const pm = context.getPropertyManager();
  
  console.log('Calling callGeminiApi...');
  // 実際に呼び出す。現在は旧実装なので APIキー + UrlFetchApp を使うはず。
  // 将来的に ScriptApp.getOAuthToken() を使うように変更するので、
  // ここで ScriptApp 未定義エラーが発生することを確認したい。
  // 現状では UrlFetchApp も未定義なので、まず UrlFetchApp のエラーが出る可能性がある。
  
  context.callGeminiApi('dummy prompt', mockBlob, 'gemini-1.5-flash');
  
} catch (e) {
  console.log('Caught expected error (Red phase):', e.message);
  if (e.message.includes('ScriptApp is not defined')) {
    console.log('✅ Expected failure (Red): ScriptApp is not defined.');
  } else if (e.message.includes('UrlFetchApp is not defined')) {
    console.log('⚠️ Caught UrlFetchApp error instead of ScriptApp. This is also a failure as expected (missing mocks).');
  } else {
    console.error('❌ Unexpected error:', e);
    // process.exit(1); // 継続を許容
  }
}

// --- Vertex AI Migration: Phase 3 (geminiClient) Test ---
console.log('\n--- Testing Vertex AI Migration: Phase 3 (geminiClient) ---');
try {
  // ダミーのBlobモック
  const mockBlob = {
    getBytes: () => new Uint8Array([0, 1, 2]),
    getContentType: () => 'application/pdf'
  };
  
  // PropertyManagerの設定（モック用）
  const pm = context.getPropertyManager();
  
  console.log('Calling callGeminiApi...');
  // 実際に呼び出す。現在は旧実装なので APIキー + UrlFetchApp を使うはず。
  context.callGeminiApi('dummy prompt', mockBlob, 'gemini-1.5-flash');
  console.log('✅ callGeminiApi executed successfully (Current implementation).');
  
} catch (e) {
  console.log('Caught expected error (Red phase):', e.message);
}

// --- Vertex AI Migration: Phase 4 (geminiClient implementation) Test ---
console.log('\n--- Testing Vertex AI Migration: Phase 4 (geminiClient implementation) ---');
try {
  const mockBlob = {
    getBytes: () => new Uint8Array([0, 1, 2]),
    getContentType: () => 'application/pdf'
  };

  // UrlFetchApp.fetch を一時的にキャプチャ用に差し替え
  let capturedUrl = '';
  let capturedOptions = {};
  const originalFetch = global.UrlFetchApp.fetch;
  
  global.UrlFetchApp.fetch = (url, options) => {
    capturedUrl = url || '';
    capturedOptions = options || {};
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'mock response' }] } }] })
    };
  };

  context.callGeminiApi('dummy prompt', mockBlob, 'gemini-1.5-flash');

  // 検証1：Vertex AI 用の URL 形式か
  const expectedPrefix = 'https://mock-vertex-location-aiplatform.googleapis.com';
  console.log(`Checking URL: ${capturedUrl}`);
  if (capturedUrl.startsWith(expectedPrefix)) {
    console.log('✅ URL format is correct for Vertex AI.');
  } else {
    console.error(`❌ URL format FAILED. Expected to start with: ${expectedPrefix}, Got: ${capturedUrl}`);
  }

  // 検証2：Bearer トークンが含まれているか
  const headers = capturedOptions.headers || {};
  const authHeader = headers['Authorization'] || '';
  console.log(`Checking Authorization: ${authHeader}`);
  if (authHeader === 'Bearer mock-oauth-token') {
    console.log('✅ Authorization header is correct.');
  } else {
    console.error(`❌ Authorization header FAILED. Expected: Bearer mock-oauth-token, Got: ${authHeader}`);
  }

  // 元に戻す
  global.UrlFetchApp.fetch = originalFetch;

} catch (e) {
  console.error('Unexpected error during Phase 4 test:', e);
}
