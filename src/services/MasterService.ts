/**
 * マスタデータ管理サービス (MasterService)
 */

import { MachineMaster, MachineTypeMaster, OperatorMaster, PartMaster, ApiResult } from '../types';

/**
 * 既存号機番号リストから最小の空き連番を算出 (AC-04)
 */
export function suggestNextMachineNo(existingNos: number[]): number {
  const sorted = [...existingNos].filter(n => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  let nextNo = 1;
  for (const no of sorted) {
    if (no === nextNo) {
      nextNo++;
    } else if (no > nextNo) {
      break;
    }
  }
  return nextNo;
}

/**
 * 種別コードと号機連番から機械IDを自動生成 (例: "NC", 3 -> "NC003")
 */
export function generateMachineId(typeCode: string, machineNo: number): string {
  const code = (typeCode || "").trim().toUpperCase();
  const padNum = String(machineNo).padStart(3, "0");
  return `${code}${padNum}`;
}

/**
 * 部品IDリストから次の部品ID（P0001形式）を算出 (AC-05)
 */
export function calculateNextPartId(existingIds: string[]): string {
  let maxNum = 0;
  for (const id of existingIds) {
    const match = String(id).trim().match(/^P(\d+)$/i);
    if (match) {
      const num = Number.parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return "P" + String(maxNum + 1).padStart(4, "0");
}

/**
 * 担当者リストの照合または次回ID番号算出 (AC-02)
 */
export function findExistingOperatorOrNextNum(
  values: string[][],
  targetName: string
): { found: boolean; existingId?: string; nextNum: number } {
  let nextNum = 1;
  const opIdRegex = /^OP(\d+)$/i;
  const normalizedTarget = targetName.trim();

  for (const r of values) {
    const existingId = String(r[0] || "").trim();
    const existingName = String(r[1] || "").trim();
    if (existingName === normalizedTarget) {
      return { found: true, existingId, nextNum };
    }
    const match = opIdRegex.exec(existingId);
    if (match) {
      const num = Number.parseInt(match[1], 10);
      if (num >= nextNum) {
        nextNum = num + 1;
      }
    }
  }
  return { found: false, nextNum };
}

/**
 * GAS環境用: 機械マスタ一覧の取得
 */
export function getMachineMasterDataFromSheet(): MachineMaster[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MachineMaster");
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
        const pad = (n: number) => String(n).padStart(2, "0");
        val = `${val.getFullYear()}/${pad(val.getMonth() + 1)}/${pad(val.getDate())}`;
      }
      obj[header] = val !== undefined && val !== null ? val : "";
    });
    return obj as MachineMaster;
  });
}

/**
 * GAS環境用: 機械ID一覧の取得
 */
export function getMachineIdsFromSheet(): string[] {
  const machines = getMachineMasterDataFromSheet();
  return machines.map(m => m.machine_id).filter(Boolean);
}

/**
 * GAS環境用: 機械種別マスタの取得
 */
export function getMachineTypeMasterDataFromSheet(): MachineTypeMaster[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MachineTypeMaster");
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h).trim());
  const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  return data.map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : "";
    });
    return obj as MachineTypeMaster;
  });
}

/**
 * GAS環境用: 担当者マスタの取得
 */
export function getOperatorMasterDataFromSheet(): OperatorMaster[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("OperatorMaster");
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
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
      }
      obj[header] = val !== undefined && val !== null ? String(val).trim() : "";
    });
    return obj as OperatorMaster;
  });
}

/**
 * GAS環境用: 部品マスタの取得
 */
export function getPartMasterDataFromSheet(): PartMaster[] {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("PartMaster");

  if (!sheet) {
    sheet = ss.insertSheet("PartMaster");
    const headers = ["part_id", "part_name", "part_number", "maker", "machine_type", "remarks"];
    const initialRows = [
      ["P0001", "主軸コレットチャック", "10-B (3爪分)", "北川鉄工所", "NC旋盤", "消耗品"],
      ["P0002", "バイトホルダー (左勝手)", "SDJCL1212F11", "三菱マテリアル", "NC旋盤", "外径加工用"],
      ["P0003", "サーボモータ用冷却ファン", "MM44-01-002", "山洋電気", "共通", "制御盤内"],
      ["P0004", "エアフィルターエレメント", "AF30-03-A", "SMC", "エアコンプレッサー", "定期交換品(6ヶ月)"],
      ["P0005", "割機用カッター刃", "CT-45-SKH", "大平テック", "割機", "自社製消耗品"]
    ];
    sheet.appendRow(headers);
    initialRows.forEach(row => sheet?.appendRow(row));
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h).trim());
  const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  return data.map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : "";
    });
    return obj as PartMaster;
  });
}

/**
 * GAS環境用: 担当者マスタ登録 (AC-02)
 */
export function addOperatorMasterDataToSheet(operatorName: string): ApiResult<{ operator_id: string; alreadyExists: boolean }> {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("OperatorMaster");

    if (!sheet) {
      sheet = ss.insertSheet("OperatorMaster");
      sheet.appendRow(["operator_id", "operator_name", "created_date"]);
    }

    const name = operatorName ? String(operatorName).trim() : "";
    if (!name) {
      return { success: false, message: "担当者名が空です。" };
    }

    const lastRow = sheet.getLastRow();
    let nextNum = 1;

    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues().map(r => r.map(c => String(c)));
      const checkResult = findExistingOperatorOrNextNum(values, name);
      if (checkResult.found && checkResult.existingId) {
        return { success: true, data: { operator_id: checkResult.existingId, alreadyExists: true }, operator_id: checkResult.existingId, alreadyExists: true };
      }
      nextNum = checkResult.nextNum;
    }

    const operatorId = "OP" + String(nextNum).padStart(3, "0");
    const createdDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");

    sheet.appendRow([operatorId, name, createdDate]);
    return { success: true, data: { operator_id: operatorId, alreadyExists: false }, operator_id: operatorId, alreadyExists: false };
  } catch (error: any) {
    console.error("担当者登録時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * GAS環境用: 部品マスタ新規登録 (AC-05)
 */
export function addPartMasterDataToSheet(partData: Partial<PartMaster>): ApiResult<{ part_id: string }> {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("PartMaster");
    if (!sheet) {
      throw new Error("「PartMaster」シートが見つかりません。");
    }

    const lastRow = sheet.getLastRow();
    const existingIds: string[] = [];
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      values.forEach(row => {
        if (row[0]) existingIds.push(String(row[0]).trim());
      });
    }

    const partId = calculateNextPartId(existingIds);

    const newRow = [
      partId,
      partData.part_name ? partData.part_name.trim() : "",
      partData.part_number ? partData.part_number.trim() : "",
      partData.maker ? partData.maker.trim() : "",
      partData.machine_type ? partData.machine_type.trim() : "",
      partData.remarks ? partData.remarks.trim() : ""
    ];

    sheet.appendRow(newRow);
    return { success: true, data: { part_id: partId }, part_id: partId };
  } catch (error: any) {
    console.error("部品登録時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * GAS環境用: 機械マスタ登録 (AC-04)
 */
export function addMachineMasterDataToSheet(machineData: Partial<MachineMaster>): ApiResult {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("MachineMaster");
    if (!sheet) {
      throw new Error("「MachineMaster」シートが見つかりません。");
    }

    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h).trim());
    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd");

    const newRow = headers.map(header => {
      if (header === "created_date") {
        return todayStr;
      }

      const val = (machineData as any)[header];
      if (val === undefined || val === null) {
        return "";
      }

      if (header === "machine_id_No" || header === "feeder_serial") {
        const num = Number(val);
        return Number.isNaN(num) ? String(val).trim() : num;
      }

      if ((header === "machine_mfg_date" || header === "feeder_mfg_date") && val) {
        const d = new Date(val);
        if (!Number.isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
        }
      }

      return String(val).trim();
    });

    sheet.appendRow(newRow);
    return { success: true };
  } catch (error: any) {
    console.error("機械マスタ登録時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}

