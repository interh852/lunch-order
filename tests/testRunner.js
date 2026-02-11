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
