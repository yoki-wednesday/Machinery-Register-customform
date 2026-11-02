import { describe, it, expect } from 'vitest';
import {
  formatDateForSheet,
  serializeParts,
  buildUpdatedRowData
} from '../src/services/MaintenanceService';

describe('MaintenanceService 単体テスト (AC-03)', () => {
  it('formatDateForSheet: HTML日付をスプレッドシート形式 yyyy/MM/dd に変換すること', () => {
    expect(formatDateForSheet('2024-05-20')).toBe('2024/05/20');
    expect(formatDateForSheet('')).toBe('');
  });

  it('serializeParts: 複数選択パーツ配列をパイプ区切り形式にシリアライズすること', () => {
    const parts = [
      { name: 'コレットチャック', code: 'P0001', qty: 2 },
      { name: 'バイトホルダー', code: 'P0002', qty: 1 }
    ];
    const serialized = serializeParts(parts);
    expect(serialized.part_number).toBe('P0001|P0002');
    expect(serialized.part_quantity).toBe('2|1');
  });

  it('buildUpdatedRowData (AC-03): input_timestamp の不変則を維持すること', () => {
    const headers = ['log_id', 'machine_id', 'maintenance_date', 'work_content', 'input_timestamp'];
    const existingRow = {
      log_id: 'uuid-1234',
      machine_id: 'NC001',
      maintenance_date: '2024/01/01',
      work_content: '初期作業内容',
      input_timestamp: '2024/01/01 10:00:00'
    };

    const formData = {
      log_id: 'uuid-1234',
      machine_id: 'NC001',
      maintenance_date: '2024-05-20',
      work_content: '更新された作業内容'
    };

    const updatedRow = buildUpdatedRowData(headers, existingRow, formData);

    const logIdIdx = headers.indexOf('log_id');
    const workContentIdx = headers.indexOf('work_content');
    const dateIdx = headers.indexOf('maintenance_date');
    const timestampIdx = headers.indexOf('input_timestamp');

    expect(updatedRow[logIdIdx]).toBe('uuid-1234');
    expect(updatedRow[workContentIdx]).toBe('更新された作業内容');
    expect(updatedRow[dateIdx]).toBe('2024/05/20');
    // 重要不変則: input_timestamp が更新されず元の値のままであること (AC-03)
    expect(updatedRow[timestampIdx]).toBe('2024/01/01 10:00:00');
  });
});

