/**
 * メンテナンス履歴管理サービス (MaintenanceService)
 */

import { ApiResult, MaintenanceFormData, MaintenanceLog } from '../types';
import { addOperatorMasterDataToSheet } from './MasterService';

/**
 * Web入力日付（YYYY-MM-DD）をスプレッドシート日付（yyyy/MM/dd）にフォーマット
 */
export function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return dateStr;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

/**
 * 複数選択パーツ配列をパイプ区切り文字列へシリアライズ
 */
export function serializeParts(
  parts: Array<{ name: string; code: string; qty: number }>
): { part_number: string; part_quantity: string } {
  if (!parts || parts.length === 0) {
    return { part_number: "", part_quantity: "" };
  }
  const codes = parts.map(p => (p.code || p.name).trim());
  const quantities = parts.map(p => String(p.qty || 1).trim());
  return {
    part_number: codes.join("|"),
    part_quantity: quantities.join("|")
  };
}

/**
 * 更新行データの組み立て（input_timestamp の不変則維持: AC-03）
 */
export function buildUpdatedRowData(
  headers: string[],
  existingRow: Record<string, any>,
  formData: Partial<MaintenanceFormData>
): any[] {
  return headers.map(header => {
    // タイムスタンプは更新しない（既存値を維持） (AC-03)
    if (header === "input_timestamp") {
      return existingRow["input_timestamp"] ?? "";
    }
    if (header === "maintenance_date") {
      return formData.maintenance_date ? formatDateForSheet(formData.maintenance_date) : (existingRow["maintenance_date"] ?? "");
    }
    const val = (formData as any)[header];
    return val !== undefined ? val : (existingRow[header] ?? "");
  });
}

/**
 * GAS環境用: メンテナンス履歴一覧の取得 (AC-01)
 */
export function getMaintenanceLogDataFromSheet(): MaintenanceLog[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MaintenanceLog");
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h).trim());
  const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  return data.map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        if (header === "maintenance_date") {
          const pad = (n: number) => String(n).padStart(2, "0");
          val = `${val.getFullYear()}/${pad(val.getMonth() + 1)}/${pad(val.getDate())}`;
        } else {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
        }
      }
      obj[header] = val !== undefined && val !== null ? String(val).trim() : "";
    });
    return obj as MaintenanceLog;
  });
}

/**
 * GAS環境用: メンテナンス履歴の新規登録 (AC-02)
 */
export function addMaintenanceLogToSheet(formData: Partial<MaintenanceFormData>): ApiResult<{ log_id: string }> {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("MaintenanceLog");
    if (!sheet) {
      throw new Error("「MaintenanceLog」シートが見つかりません。");
    }

    const operatorName = formData.operator_name ? formData.operator_name.trim() : "";
    if (operatorName) {
      addOperatorMasterDataToSheet(operatorName);
    }

    const logId = Utilities.getUuid();
    const inputTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
    const maintenanceDate = formData.maintenance_date ? formatDateForSheet(formData.maintenance_date) : "";

    const newRow = [
      logId,
      formData.machine_id ? String(formData.machine_id).trim() : "",
      maintenanceDate,
      formData.work_content ? formData.work_content.trim() : "",
      formData.part_number ? formData.part_number.trim() : "",
      formData.remarks ? formData.remarks.trim() : "",
      inputTimestamp,
      formData.part_quantity ? formData.part_quantity.trim() : "",
      operatorName
    ];

    sheet.appendRow(newRow);
    return { success: true, data: { log_id: logId }, log_id: logId };
  } catch (error: any) {
    console.error("メンテナンス履歴追加時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * GAS環境用: メンテナンス履歴の更新 (AC-03)
 */
export function updateMaintenanceLogToSheet(formData: Partial<MaintenanceFormData>): ApiResult {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("MaintenanceLog");
    if (!sheet) {
      return { success: false, message: "MaintenanceLogシートが見つかりません。" };
    }

    const operatorName = formData.operator_name ? formData.operator_name.trim() : "";
    if (operatorName) {
      addOperatorMasterDataToSheet(operatorName);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: "更新対象のデータがありません。" };
    }

    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h).trim());
    const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

    const logIdIndex = headers.indexOf("log_id");
    if (logIdIndex === -1) {
      return { success: false, message: "log_id列がシート内に定義されていません。" };
    }

    let targetRowIndex = -1;
    let existingRowRecord: Record<string, any> = {};

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][logIdIndex]).trim() === String(formData.log_id).trim()) {
        targetRowIndex = i + 2;
        headers.forEach((h, hIdx) => {
          existingRowRecord[h] = values[i][hIdx];
        });
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: "指定された記録IDが見つかりません。" };
    }

    const rowData = buildUpdatedRowData(headers, existingRowRecord, formData);
    sheet.getRange(targetRowIndex, 1, 1, lastColumn).setValues([rowData]);

    return { success: true };
  } catch (error: any) {
    console.error("メンテナンス履歴更新時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}

