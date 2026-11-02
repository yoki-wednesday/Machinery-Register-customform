/**
 * Machinery-Register-customform 型定義
 */

/** 機械マスタ (MachineMaster) */
export interface MachineMaster {
  machine_id: string;          // 主キー (例: "NC001")
  machine_id_No: number;       // 号機番号 (例: 1)
  machine_type: string;        // 機械種類 (例: "NC旋盤")
  machine_model?: string;      // 機械機種 (例: "cincom B-12 3F5N型")
  machine_mfg_date?: string;   // 製造年月日 (例: "2015/04/01")
  machine_serial?: string;     // 機械機番 (例: "Z1234")
  feeder_name?: string;        // 給材機名 (例: "育良精機")
  feeder_model?: string;       // 給材機形式 (例: "SF6DA-2.5")
  feeder_serial?: string;      // 給材機機番
  feeder_mfg_date?: string;    // 給材機製造年月日
  remarks?: string;            // 備考
  created_date?: string;       // 登録日 (例: "2024/01/15")
}

/** 担当者マスタ (OperatorMaster) */
export interface OperatorMaster {
  operator_id: string;         // 主キー (例: "OP001")
  operator_name: string;       // 担当者氏名
  created_date?: string;       // 登録日時
}

/** 部品マスタ (PartMaster) */
export interface PartMaster {
  part_id: string;             // 主キー (例: "P0001")
  part_name: string;           // 部品名
  part_number: string;         // 部品型番・コード (例: "10-B (3爪分)")
  maker?: string;              // メーカー (例: "北川鉄工所")
  machine_type?: string;       // 対象機械種類 (例: "NC旋盤", "共通")
  remarks?: string;            // 備考
}

/** 機械種別マスタ (MachineTypeMaster) */
export interface MachineTypeMaster {
  machine_type: string;        // 機械種別名称 (例: "NC旋盤")
  type_code: string;           // プレフィックスコード (例: "NC")
}

/** メンテナンス履歴 (MaintenanceLog) */
export interface MaintenanceLog {
  log_id: string;              // 主キー (UUID)
  machine_id: string;          // 外部キー -> MachineMaster.machine_id
  maintenance_date: string;    // 作業日 (例: "2024/05/20")
  work_content: string;        // 作業内容
  part_number: string;         // 交換部品コード (パイプ区切り: "P-01|P-02")
  remarks: string;             // 備考・連絡事項
  input_timestamp: string;     // 入力日時 (作成時固定: "2024/05/20 14:30:00")
  part_quantity?: string;      // 数量 (パイプ区切り: "1|2")
  operator_name?: string;      // 担当者名
}

/** 作業報告書OCR結果 (OcrResult) */
export interface OcrResult {
  workNo: string;              // 作業番号 (例: "10014958")
  completionDate: string;      // 作業完了日
  modelType: string;           // 機種型式
  machineNo: string;           // 機番
  deliveryDate: string;        // 納入日
  status: string;              // 状況・現象
  investigation: string;       // 調査内容・原因
  process: string;             // 処置・作業内容
  remarks: string;             // 連絡事項・特記事項
  partsStr: string;            // 抽出部品文字列
  replacedParts: string[];     // 交換部品1〜10 (コード|品名|数量)
  partsDetails: Array<{
    code: string;
    name: string;
    qty: number;
    price: number;
  }>;
  resultRow: string[];         // スプレッドシート保存用行データ配列
}

/** フロントエンド フォーム入力状態 */
export interface MaintenanceFormData {
  log_id?: string;
  machine_id: string;
  machine_type?: string;
  maintenance_date: string;
  operator_name: string;
  work_content: string;
  part_number?: string;
  part_quantity?: string;
  selected_parts: Array<{
    name: string;
    code: string;
    qty: number;
  }>;
  remarks: string;
}

/** APIレスポンス標準型 */
export interface ApiResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

