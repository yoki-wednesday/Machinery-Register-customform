import { describe, it, expect } from 'vitest';
import {
  convertHankakuToZenkaku,
  normalizeText,
  cleanPartName,
  parseCsvRows
} from '../src/utils/TextUtils';

describe('TextUtils 単体テスト', () => {
  it('convertHankakuToZenkaku: 半角カナ・濁点・半濁点を全角カナへ正しく変換すること', () => {
    expect(convertHankakuToZenkaku('ｶﾞｲﾄﾞ')).toBe('ガイド');
    expect(convertHankakuToZenkaku('ﾎﾟﾝﾌﾟ')).toBe('ポンプ');
    expect(convertHankakuToZenkaku('ｱｲｳｴｵ')).toBe('アイウエオ');
    expect(convertHankakuToZenkaku('')).toBe('');
  });

  it('normalizeText: 全角英数の半角化・波ダッシュ・ハイフンの正規化を行うこと', () => {
    expect(normalizeText('ＡＢＣ　１２３')).toBe('ABC 123');
    expect(normalizeText('～ ‐ — ♯ ㎛')).toBe('〜 - - # μm');
    expect(normalizeText('')).toBe('');
  });

  it('cleanPartName: 品目コードや金額を除外し、部品名を整形すること', () => {
    const row = ['10-B', '主軸コレットチャック', '1', '¥15,000'];
    const cleaned = cleanPartName(row);
    expect(cleaned).toBe('主軸コレットチャック');
  });

  it('parseCsvRows: クォートを含むCSVテキストを正しく二次元配列にパースすること', () => {
    const csv = '"品目コード","品目名, 型式","数量"\n"P001","サーボモータ","2"';
    const rows = parseCsvRows(csv);
    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual(['品目コード', '品目名, 型式', '数量']);
    expect(rows[1]).toEqual(['P001', 'サーボモータ', '2']);
  });
});

