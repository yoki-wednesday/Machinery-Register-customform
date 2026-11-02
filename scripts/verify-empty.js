const fs = require('fs');
const path = require('path');

function checkDir(dir, emptyFiles = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      checkDir(fullPath, emptyFiles);
    } else if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      if (stats.size === 0) {
        emptyFiles.push(fullPath);
      }
    }
  }
  return emptyFiles;
}

const emptyFiles = checkDir(process.cwd());
if (emptyFiles.length > 0) {
  console.error('❌ 空ファイル (0バイト) が検出されました:');
  emptyFiles.forEach(f => console.error('  - ' + path.relative(process.cwd(), f)));
  process.exit(1);
} else {
  console.log('✅ 空ファイル (0バイト) 検証パス: 空ファイルは存在しません。');
  process.exit(0);
}

