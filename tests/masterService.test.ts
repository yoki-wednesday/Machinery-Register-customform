import { describe, it, expect } from 'vitest';
import {
  suggestNextMachineNo,
  generateMachineId,
  calculateNextPartId,
  findExistingOperatorOrNextNum
} from '../src/services/MasterService';

describe('MasterService 単体テスト (AC-02, AC-04, AC-05)', () => {
  describe('suggestNextMachineNo (AC-04: 空き連番サジェスト)', () => {
    it('1, 2, 4 が存在する場合、最小の空き連番 3 を返却すること', () => {
      expect(suggestNextMachineNo([1, 2, 4])).toBe(3);
    });

    it('リストが空の場合、1 を返却すること', () => {
      expect(suggestNextMachineNo([])).toBe(1);
    });

    it('1, 2, 3 と連番が揃っている場合、次の 4 を返却すること', () => {
      expect(suggestNextMachineNo([1, 2, 3])).toBe(4);
    });

    it('順不同や重複が存在しても正確に最小の空き連番を算出すること', () => {
      expect(suggestNextMachineNo([5, 2, 1, 2, 3])).toBe(4);
    });
  });

  describe('generateMachineId (AC-04: 機械IDプレフィックス自動生成)', () => {
    it('種別コード "NC" と号機連番 3 から "NC003" を生成すること', () => {
      expect(generateMachineId('NC', 3)).toBe('NC003');
    });

    it('小文字 "wr" と号機連番 12 から大文字 "WR012" を生成すること', () => {
      expect(generateMachineId('wr', 12)).toBe('WR012');
    });
  });

  describe('calculateNextPartId (AC-05: 部品マスタ自動採番)', () => {
    it('既存ID P0001, P0002 が存在する場合、P0003 を返却すること', () => {
      expect(calculateNextPartId(['P0001', 'P0002'])).toBe('P0003');
    });

    it('既存IDが空の場合、P0001 を返却すること', () => {
      expect(calculateNextPartId([])).toBe('P0001');
    });

    it('最大連番が 12 の場合、P0013 を返却すること', () => {
      expect(calculateNextPartId(['P0001', 'P0012', 'P0005'])).toBe('P0013');
    });
  });

  describe('findExistingOperatorOrNextNum (AC-02: 担当者重複防止と連番)', () => {
    const existing = [
      ['OP001', '佐藤一郎'],
      ['OP002', '鈴木次郎']
    ];

    it('既存の担当者名と一致した場合、found: true と既存IDを返却すること', () => {
      const result = findExistingOperatorOrNextNum(existing, '佐藤一郎');
      expect(result.found).toBe(true);
      expect(result.existingId).toBe('OP001');
    });

    it('新規担当者の場合、found: false と次の番号 3 を返却すること', () => {
      const result = findExistingOperatorOrNextNum(existing, '山田太郎');
      expect(result.found).toBe(false);
      expect(result.nextNum).toBe(3);
    });
  });
});

