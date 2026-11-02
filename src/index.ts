/**
 * Google Apps Script エントリーポイント (公開RPC & WebAppハンドラ)
 */

import {
  suggestNextMachineNo,
  generateMachineId,
  getMachineMasterDataFromSheet,
  getMachineIdsFromSheet,
  getMachineTypeMasterDataFromSheet,
  getOperatorMasterDataFromSheet,
  getPartMasterDataFromSheet,
  addOperatorMasterDataToSheet,
  addPartMasterDataToSheet,
  addMachineMasterDataToSheet
} from './services/MasterService';

import {
  getMaintenanceLogDataFromSheet,
  addMaintenanceLogToSheet,
  updateMaintenanceLogToSheet
} from './services/MaintenanceService';

import {
  extractOcrMetadata,
  extractOcrSections,
  extractOcrParts,
  applyOcrCorrections
} from './parsers/OcrParser';

import { normalizeText } from './utils/TextUtils';
import { ApiResult, MachineMaster, MachineTypeMaster, MaintenanceFormData, MaintenanceLog, OcrResult, OperatorMaster, PartMaster } from './types';

// Drive API の型補完
declare const Drive: any;

/**
 * Webアプリにアクセスがあった際にHTMLを表示する
 */
export function doGet(e?: any): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile("index");
  return template.evaluate()
    .setTitle("機械メンテナンス入力フォーム")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 機械ID一覧の取得
 */
export function getMachineIds(): string[] {
  return getMachineIdsFromSheet();
}

/**
 * 機械マスタの全件取得
 */
export function getMachineMasterData(): MachineMaster[] {
  return getMachineMasterDataFromSheet();
}

/**
 * 機械種別マスタの全件取得
 */
export function getMachineTypeMasterData(): MachineTypeMaster[] {
  return getMachineTypeMasterDataFromSheet();
}

/**
 * メンテナンス履歴の全件取得
 */
export function getMaintenanceLogData(): MaintenanceLog[] {
  return getMaintenanceLogDataFromSheet();
}

/**
 * 部品マスタの全件取得
 */
export function getPartMasterData(): PartMaster[] {
  return getPartMasterDataFromSheet();
}

/**
 * 担当者マスタの全件取得
 */
export function getOperatorMasterData(): OperatorMaster[] {
  return getOperatorMasterDataFromSheet();
}

/**
 * 担当者マスタの新規登録
 */
export function addOperatorMasterData(operatorName: string): ApiResult<{ operator_id: string; alreadyExists: boolean }> {
  return addOperatorMasterDataToSheet(operatorName);
}

/**
 * 部品マスタの新規登録
 */
export function addPartMasterData(partData: Partial<PartMaster>): ApiResult<{ part_id: string }> {
  return addPartMasterDataToSheet(partData);
}

/**
 * 機械マスタの新規登録
 */
export function addMachineMasterData(machineData: Partial<MachineMaster>): ApiResult {
  return addMachineMasterDataToSheet(machineData);
}

/**
 * メンテナンス履歴の新規登録
 */
export function addMaintenanceLog(formData: Partial<MaintenanceFormData>): ApiResult<{ log_id: string }> {
  return addMaintenanceLogToSheet(formData);
}

/**
 * メンテナンス履歴の更新
 */
export function updateMaintenanceLog(formData: Partial<MaintenanceFormData>): ApiResult {
  return updateMaintenanceLogToSheet(formData);
}

/**
 * スプレッドシートURLの取得
 */
export function getSpreadsheetUrl(): string {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getUrl();
  } catch (e: any) {
    console.error("スプレッドシートURL取得エラー: ", e);
    return "";
  }
}

/**
 * OCR用Driveドキュメント変換ヘルパー
 */
function createOcrDocFile(pdfFileId: string, blob: GoogleAppsScript.Base.Blob): any {
  try {
    return Drive.Files.insert(
      { title: 'temp_ocr_' + pdfFileId, mimeType: 'application/vnd.google-apps.document' },
      blob,
      { ocr: true, ocrLanguage: 'ja' }
    );
  } catch (error_) {
    console.warn("Drive API v2 insert failed, trying v3 create:", error_);
    try {
      return Drive.Files.create(
        { name: 'temp_ocr_' + pdfFileId, mimeType: 'application/vnd.google-apps.document' },
        blob,
        { ocr: true, ocrLanguage: 'ja' }
      );
    } catch (error) {
      console.error("Drive API v3 create failed:", error);
      throw new Error("OCR変換の実行に失敗しました。Drive APIサービスが有効化されているか確認してください。エラー: " + String(error));
    }
  }
}

/**
 * PDFからGoogle OCR経由でテキストを抽出しパースする
 */
export function parsePdfViaOcr(pdfFileId: string, filename: string): OcrResult {
  const file = DriveApp.getFileById(pdfFileId);
  const blob = file.getBlob();
  const tempDocFile = createOcrDocFile(pdfFileId, blob);

  const tempId = tempDocFile.id || tempDocFile.getId();
  const doc = DocumentApp.openById(tempId);
  const textFull = doc.getBody().getText();

  DriveApp.getFileById(tempId).setTrashed(true);

  const meta = extractOcrMetadata(textFull, filename);
  const sections = extractOcrSections(textFull);
  const { partsList, partsDetails: extractedPartsDetails } = extractOcrParts(textFull, meta.workNo);

  const normStatus = normalizeText(sections.status);
  const normInvestigation = normalizeText(sections.investigation);
  const normProcess = normalizeText(sections.process);
  const normRemarks = normalizeText(sections.remarks);
  const normPartsList = partsList.map(p => normalizeText(p));
  const partsStr = normPartsList.length > 0 ? normPartsList.join("、") : "-";

  const initialRow = [
    meta.workNo,
    meta.completionDate,
    meta.modelType,
    meta.machineNo,
    meta.deliveryDate,
    normStatus,
    normInvestigation,
    normProcess,
    "",
    normRemarks,
    partsStr
  ];

  const corrected = applyOcrCorrections(meta.workNo, initialRow, extractedPartsDetails);

  return {
    workNo: meta.workNo,
    completionDate: corrected.resultRow[1] || meta.completionDate,
    modelType: corrected.resultRow[2] || meta.modelType,
    machineNo: corrected.resultRow[3] || meta.machineNo,
    deliveryDate: corrected.resultRow[4] || meta.deliveryDate,
    status: corrected.resultRow[5] || normStatus,
    investigation: corrected.resultRow[6] || normInvestigation,
    process: corrected.resultRow[7] || normProcess,
    remarks: corrected.resultRow[9] || normRemarks,
    partsStr: corrected.resultRow[10] || partsStr,
    replacedParts: corrected.replacedParts,
    partsDetails: corrected.partsDetails,
    resultRow: corrected.resultRow
  };
}

/**
 * OCR抽出データを「シチズンマシナリー作業報告書」シートへ保存
 */
export function saveOcrToSheet(ocrResult: OcrResult): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "シチズンマシナリー作業報告書";
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = [
      "作業番号", "作業完了日", "機種型式", "機番", "納入日", "状況", "原因", "処置", "連絡事項",
      "交換部品1", "交換部品2", "交換部品3", "交換部品4", "交換部品5",
      "交換部品6", "交換部品7", "交換部品8", "交換部品9", "交換部品10",
      "OCR解析ステータス", "OCR生テキスト", "OCR解析実行日"
    ];
    sheet.appendRow(headers);
    SpreadsheetApp.flush();
  }

  const parsedDateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");

  const rowData: any[] = [
    ocrResult.workNo || "",
    ocrResult.completionDate || "",
    ocrResult.modelType || "",
    ocrResult.machineNo || "",
    ocrResult.deliveryDate || "",
    ocrResult.status || "",
    ocrResult.investigation || "",
    ocrResult.process || "",
    ocrResult.remarks || ""
  ];

  for (let i = 0; i < 10; i++) {
    rowData.push(ocrResult.replacedParts ? ocrResult.replacedParts[i] : "");
  }

  rowData.push("Success", "", parsedDateStr);
  sheet.appendRow(rowData);
}

/**
 * Base64画像/PDFからOCRを実行してシート保存
 */
export function runOcrOnBlob(base64Data: string, filename: string): ApiResult<OcrResult> {
  const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
  const blob = Utilities.newBlob(bytes, "application/pdf", filename);

  const tempFile = DriveApp.createFile(blob);
  const fileId = tempFile.getId();

  try {
    const ocrResult = parsePdfViaOcr(fileId, filename);
    saveOcrToSheet(ocrResult);
    return { success: true, data: ocrResult };
  } catch (error: any) {
    console.error("runOcrOnBlob error: ", error);
    return { success: false, message: error.message };
  } finally {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (e) {
      console.warn("Failed to trash temp file:", fileId, e);
    }
  }
}

// GAS グローバルスコープ登録 (google.script.run が参照できるように globalThis に公開)
declare const global: any;
const gasScope: any = typeof globalThis !== "undefined" ? globalThis : (typeof global !== "undefined" ? global : {});

gasScope.doGet = doGet;
gasScope.getMachineIds = getMachineIds;
gasScope.getMachineMasterData = getMachineMasterData;
gasScope.getMachineTypeMasterData = getMachineTypeMasterData;
gasScope.getMaintenanceLogData = getMaintenanceLogData;
gasScope.getPartMasterData = getPartMasterData;
gasScope.getOperatorMasterData = getOperatorMasterData;
gasScope.addOperatorMasterData = addOperatorMasterData;
gasScope.addPartMasterData = addPartMasterData;
gasScope.addMachineMasterData = addMachineMasterData;
gasScope.addMaintenanceLog = addMaintenanceLog;
gasScope.updateMaintenanceLog = updateMaintenanceLog;
gasScope.getSpreadsheetUrl = getSpreadsheetUrl;
gasScope.runOcrOnBlob = runOcrOnBlob;
gasScope.parsePdfViaOcr = parsePdfViaOcr;
gasScope.saveOcrToSheet = saveOcrToSheet;

