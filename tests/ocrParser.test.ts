import { describe, it, expect } from 'vitest';
import {
  extractWorkNo,
  extractModelType,
  extractMachineNo,
  extractOcrMetadata,
  extractOcrSections,
  applyOcrCorrections,
  parseOcrText
} from '../src/parsers/OcrParser';

describe('OcrParser 単体テスト (AC-06)', () => {
  it('extractWorkNo: ファイル名または本文から作業番号8桁を抽出すること', () => {
    expect(extractWorkNo('本文中の番号 10014958 です', 'scan.pdf')).toBe('10014958');
    expect(extractWorkNo('テキスト', '10014958_report.pdf')).toBe('10014958');
  });

  it('extractModelType & extractMachineNo: 機種型式と機番を抽出すること', () => {
    const text = '"機種型式", "B12-5"\n"機番", "Z12345"';
    expect(extractModelType(text)).toBe('B12-5');
    expect(extractMachineNo(text)).toBe('Z12345');
  });

  it('extractOcrSections: 状況・調査内容・処置・連絡事項を適切に分離抽出すること', () => {
    const text = `
状況: モーター異音が発生。
調査内容: ベアリング摩耗を確認。
処置: ベアリング一式を新品に交換し動作確認。
連絡事項: 次回定期点検時に再確認をお願いします。
品目コード
    `;
    const sections = extractOcrSections(text);
    expect(sections.status).toBe('モーター異音が発生。');
    expect(sections.investigation).toBe('ベアリング摩耗を確認。');
    expect(sections.process).toBe('ベアリング一式を新品に交換し動作確認。');
    expect(sections.remarks).toBe('次回定期点検時に再確認をお願いします。');
  });

  it('applyOcrCorrections: 既知の作業番号(10014958)に対する個別補正辞書が正しく適用されること', () => {
    const initialRow = new Array(11).fill('');
    initialRow[0] = '10014958';
    const corrected = applyOcrCorrections('10014958', initialRow, []);
    expect(corrected.resultRow[7]).toContain('背面主軸振れ、走り確認も良好');
    expect(corrected.resultRow[9]).toContain('パラメータ変更');
  });

  it('parseOcrText: 完全なテキストからOcrResultオブジェクトを生成すること', () => {
    const sampleText = `
作業番号: 10014958
納入日: 2020年04月01日
作業完了日: 2024年05月20日
B12-3F5N
Z9876
状況: 背面主軸の芯ズレ
処置: 芯調整実施
品目コード
P01 ボルト 4
    `;
    const result = parseOcrText(sampleText, '10014958.pdf');
    expect(result.workNo).toBe('10014958');
    expect(result.modelType).toContain('B12');
    expect(result.machineNo).toBe('Z9876');
    expect(result.completionDate).toContain('2024年05月20日');
  });
});

