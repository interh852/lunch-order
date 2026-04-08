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
  'src/services/invoiceService.js'
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
