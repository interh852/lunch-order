
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
