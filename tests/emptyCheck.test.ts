import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function findEmptyFiles(dir: string, emptyList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      findEmptyFiles(fullPath, emptyList);
    } else if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      if (stats.size === 0) {
        emptyList.push(fullPath);
      }
    }
  }
  return emptyList;
}

describe('空ファイル検証 (AC-09)', () => {
  it('プロジェクト内に 0 バイトの空ファイルが存在しないこと', () => {
    const emptyFiles = findEmptyFiles(process.cwd());
    expect(emptyFiles).toEqual([]);
  });
});

