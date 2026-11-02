const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  const distDir = path.resolve(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. esbuild で TypeScript をバンドル
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/Code.js',
    format: 'iife',
    globalName: 'GasBundle',
    target: 'es2022',
    charset: 'utf8',
  });

  // 2. GASの公開関数トップレベルラッパーを追記（google.script.run および GAS トリガー完全互換）
  const exportedFunctions = [
    'doGet',
    'getMachineIds',
    'getMachineMasterData',
    'getMachineTypeMasterData',
    'getMaintenanceLogData',
    'getPartMasterData',
    'getOperatorMasterData',
    'addOperatorMasterData',
    'addPartMasterData',
    'addMachineMasterData',
    'addMaintenanceLog',
    'updateMaintenanceLog',
    'getSpreadsheetUrl',
    'runOcrOnBlob',
    'parsePdfViaOcr',
    'saveOcrToSheet'
  ];

  let wrapperCode = '\n// --- GAS Public Function Wrappers ---\n';
  for (const fn of exportedFunctions) {
    wrapperCode += `function ${fn}(...args) { return GasBundle.${fn}(...args); }\n`;
  }
  fs.appendFileSync(path.join(distDir, 'Code.js'), wrapperCode, 'utf8');

  // 3. appsscript.json のコピー
  const manifestSrc = path.resolve(__dirname, 'appsscript.json');
  const manifestDst = path.resolve(distDir, 'appsscript.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDst);
  }

  // 4. HTMLアセットのコピー (src/index.html -> dist/index.html)
  const htmlSrc = path.resolve(__dirname, 'src/index.html');
  const htmlDst = path.resolve(distDir, 'index.html');
  if (fs.existsSync(htmlSrc)) {
    fs.copyFileSync(htmlSrc, htmlDst);
  }

  console.log('✅ ビルド完了: dist/Code.js, dist/index.html, dist/appsscript.json');
}

build().catch(err => {
  console.error('❌ ビルドエラー:', err);
  process.exit(1);
});

