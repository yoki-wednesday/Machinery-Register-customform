# 機能仕様書: Machinery-Register-customform (機械台帳・メンテナンス管理システム)

## 1. 要求とスコープ (Requirements & Scope)
### 1.1 背景 & 目的
工作機械（NC旋盤、割機、ヒラキ機、溝入機、自動組立機、自動検査機、エアコンプレッサー等）および付随する給材機（オートローダー/バーフィーダー等）の基本台帳情報と、日常および定期メンテナンス履歴をGoogleスプレッドシート上で一元管理するWebアプリケーション。
メーカー（シチズンマシナリー等）から発行されるPDF/紙の「作業報告書（サービスレポート）」をOCR（光学文字認識）によって自動解析し、作業番号・作業内容・原因・処置・交換部品を自動抽出してメンテナンス履歴への登録・部品マスタ登録を半自動化することで、転記ミスの防止と現場入力工数の大幅な削減を達成する。

### 1.2 対象 (In Scope)
- **1. メンテナンス履歴閲覧機能 (`view`タブ)**:
  - 機械種別（`MachineTypeMaster`連動）および号機番号（`machine_id`）による絞り込み。
  - フリーワード検索（号機、作業内容、備考、交換部品名を対象にしたインクリメンタルフィルタ）。
  - 作業日降順（新しい順）によるソート表示。
  - 選択号機の詳細スペックカード（機種、製造年月、シリアル、給材機情報）の連動表示。
  - レスポンシブ対応（PC向けテーブル表示／スマートフォン向けカード表示）。
  - 交換部品の名称・型番・数量の整形表示（PartMasterマッピング）。
  - 履歴レコードごとの「編集」ボタンによる入力フォームへの展開。
- **2. メンテナンス履歴入力・編集機能 (`input`タブ)**:
  - 機械種別および号機の選択ドロップダウン（マスタ連動）。
  - 作業日（日付ピッカー）、担当者名（`OperatorMaster` からのdatalist自動補完＋自由入力時のマスタ自動登録）。
  - 作業内容入力（テキストエリア）。
  - 交換部品の複数選択（部品マスタ検索モーダルからの追加・数量指定・削除）。
  - 備考・残処理・調整費内訳の入力。
  - 排他制御（`LockService.getScriptLock(30000)`）による安全な新規登録（UUID採番）および更新処理（既存`log_id`行の書き換え、初回入力タイムスタンプ保持）。
- **3. 新規機械マスタ登録機能 (`machine_register`タブ)**:
  - 機械種類（`MachineTypeMaster`）の選択。
  - 種類ごとの号機番号（`machine_id_No`）の自動サジェスト（最小の空き連番を自動算出）。
  - 機械ID（`machine_id`）の自動生成（種類コードプレフィックス ＋ 3桁ゼロ埋め連番、例: `NC001`）。
  - 既存機種（`machine_model`）のチップUIクイック選択、製造年月日、機番（シリアル）、用途備考の入力。
  - 給材機情報アコーディオン（給材機名・形式・機番・製造年月日の入力、既存登録値からのサジェスト）。
  - 登録前の確認ダイアログ（`confirm`）と排他制御付きマスタ追記。
- **4. サービスレポートOCR解析機能 (`ocr`タブ)**:
  - PDFおよび画像ファイル（PNG, JPG等、最大10MB）のファイル選択およびドラッグ＆ドロップ。
  - Google Drive API + DocumentApp を利用した日本語OCR実行。
  - メタデータ（作業番号、作業完了日、機種型式、機番、納入日）の正規表現パース。
  - セクション本文（状況、調査内容、処置、連絡事項/特記事項）の自動分割抽出。
  - 交換部品情報（品目コード、部品名、数量、単価）のテーブル/CSV行解析。
  - 既知の作業報告書に対する個別補正辞書（`applyOcrCorrections`）の適用。
  - 解析結果の「シチズンマシナリー作業報告書」シートへの自動永続化ログ保存。
  - 未登録部品のワンクリック「部品マスタ（PartMaster）追加」モーダル連携。
  - 「履歴入力フォームへ転記」ボタンによる入力画面自動遷移（機番照合による号機特定、日付変換、本文結合、部品リスト転記）。
- **5. 部品マスタモーダル & マスタ管理機能**:
  - キーワード検索による既存部品の絞り込みとチェックボックス複数選択。
  - モーダル内からの新規部品マスタ即時登録（`P0001`形式連番自動採番、排他制御）。
- **6. アプリケーション共通機能**:
  - ライト／ダークテーマ切り替え（DaisyUI / Tailwind CSS、`localStorage`永続化）。
  - アクティブなGoogleスプレッドシートを開くダイレクトリンク。
  - トースト通知（成功・エラーのアラートメッセージ表示）。
- **7. Google Apps Script (V8) + TypeScript (clasp) 開発・ビルド・検証基盤**:
  - TypeScript（厳格モード）によるGASバックエンドロジックの完全型安全化（`src/` 配下）。
  - `@types/google-apps-script` によるGAS組み込みAPI（`SpreadsheetApp`, `DriveApp`, `LockService` 等）の型定義適用。
  - clasp 連携用マニフェスト（`appsscript.json`）とプロジェクト設定（`.clasp.json`）。
  - TypeScript から GAS V8 実行可能形式（グローバル関数エクスポート）への esbuild バンドル・ビルドパイプライン（`dist/` 出力、HTMLファイルの自動同期）。
  - Vitest による高速単体テスト環境および決定論的型検査（`tsc --noEmit`）。
  - 固定デプロイID運用（`npm run deploy:gas:dev` / `npm run deploy:gas:prod`）を前提とした標準デプロイスクリプト構成。

### 1.3 対象外 (Out of Scope - 現行資産における未実装・将来検討事項)
- 穴寸法 ＆ Fusionパラメータ内の横穴の管理（※今後の改修要件「syncRequirements」として予定）。
- ユーザー認証・アクセス権限制御（全社内Googleアカウントまたは全体共有URLベース）。
- 履歴データの物理削除機能（誤登録の削除APIは未提供、直接スプレッドシート編集で対応）。
- オフライン動作（PWA / ServiceWorker 非対応、常時GAS接続必須）。
- サービスレポート以外の画像・添付ファイルのドライブ永続化。
- GAS Webエディタ上でのコード直接編集・保守（ローカルTypeScript + claspによるビルド・Pushを唯一の正とする）。

---

## 2. 制約条件・アーキテクチャ境界 (Constitution & Invariants)

### 2.1 不変則 (Invariants)
1. **データ一意性と採番規則**:
   - `log_id`: `Utilities.getUuid()` によるRFC4122準拠のUUID文字列。
   - `operator_id`: `OP` + 3桁数字（例: `OP001`）。同姓同名の重複登録を禁止し、同一名が存在する場合は既存IDを流用。
   - `part_id`: `P` + 4桁数字（例: `P0001`）。最大値+1による自動インクリメント。
   - `machine_id`: 機械種別コード（`NC`, `WR`, `HR`, `MZ`, `AK`, `AI`, `AC`等） + 3桁数字（例: `NC001`）。
2. **排他制御 (Concurrency Guard)**:
   - スプレッドシートへの書き込みを行う全てのGAS関数（`addMaintenanceLog`, `updateMaintenanceLog`, `addOperatorMasterData`, `addPartMasterData`, `addMachineMasterData`）は、必ず `LockService.getScriptLock()` を取得し、最大30,000ミリ秒（30秒）待機すること。
   - `finally` 節で必ず `lock.releaseLock()` を呼出し、デッドロックを防止すること。
3. **タイムスタンプの不可逆性**:
   - `MaintenanceLog` の既存更新時（`updateMaintenanceLog`）、初回登録時の `input_timestamp` は絶対に変更せず維持すること。
4. **日付フォーマット規約**:
   - Webクライアント内部: `YYYY-MM-DD`（HTML5 date input標準）。
   - スプレッドシート保存形式: `yyyy/MM/dd` または `yyyy/MM/dd HH:mm:ss`（JSTタイムゾーン基準）。

### 2.2 依存関係 / 技術制約
- **実行基盤**: Google Apps Script (V8 Runtime)
- **開発・ビルド環境**:
  - Node.js (v20以上) + TypeScript (v5.x 厳格モード)
  - `@google/clasp` (v2.4+): GASプロジェクト同期・Push・デプロイ
  - `@types/google-apps-script`: Google Apps Script組み込みAPIの完全型定義
  - `esbuild`: 高速バンドラー（GAS V8 グローバルスコープ形式への変換および出力）
  - `vitest`: 高速ユニットテストフレームワーク（Node.js環境でのロジック・パーサー検証）
  - 出力ディレクトリ: `dist/`（`clasp push` 対象、`appsscript.json` および HTMLアセットを含む）
- **連携Googleサービス**:
  - `SpreadsheetApp`: データベースとして使用
  - `DriveApp` / Google Drive API (v2 / v3): 一時OCRドキュメント作成
  - `DocumentApp`: OCR結果テキスト抽出
  - `LockService`: トランザクション排他制御
  - `Utilities`: UUID生成、Base64デコード、日付フォーマット
- **フロントエンド構成**:
  - HTML5 + Tailwind CSS (v4 Browserビルド) + DaisyUI
  - Alpine.js (v3.x): リアクティブ状態管理
  - Google Apps Script Client API (`google.script.run`) による非同期RPC
- **GAS制約**:
  - 1回のスクリプト実行制限（無料アカウント: 最大6分、Workspace有料アカウント: 最大30分）。
  - Google Drive OCR処理時のDrive API有効化（マニフェスト `appsscript.json` への依存）。

---

## 3. 技術設計 & コントラクト (Technical Design & Contracts)

### 3.1 データモデル / インターフェース定義 (TypeScript)

```typescript
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

/** 作業報告書OCR結果 (OCRResult) */
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

export interface ApiResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}
```

### 3.2 状態遷移 & エラーハンドリング

#### 1. データ取得フロー (`loadData`)
- クライアント初期化時に `getMachineMasterData`, `getMaintenanceLogData`, `getPartMasterData`, `getOperatorMasterData`, `getMachineTypeMasterData` を並行呼出し（5つの非同期完了カウンタでスピナー制御）。
- 各API呼出のエラー時はトースト通知（`showAlert('error', ...)`）を出力。

#### 2. メンテナンス履歴登録・更新フロー (`submitForm`)
- 入力値検証: `machine_id` (必須)、`maintenance_date` (必須)。
- 複数部品選択配列（`selected_parts`）をパイプ区切り形式（`part_number` と `part_quantity`）へシリアライズ。
- 新規登録時 (`!isEditing`):
  - `addMaintenanceLog` API呼出。
  - 成功時: 作業内容・部品・備考をリセット（号機・作業日・担当者は連続入力便宜のため保持）、`loadData()` で再同期。
- 編集更新時 (`isEditing`):
  - `updateMaintenanceLog` API呼出。
  - 成功時: フォーム完全初期化、`isEditing = false`、`tab = 'view'` へ遷移して再読み込み。
- エラー時: ロックタイムアウト（30秒）またはシート未検出例外をキャッチし、ユーザーへエラー理由を表示。

#### 3. OCR解析 & 転記フロー (`processOcrFile` -> `copyOcrToInputForm`)
- クライアント: `FileReader` によりファイルをBase64 DataURLへ変換。
- サーバー (`runOcrOnBlob`):
  1. Base64デコードしてPDF Blob生成。
  2. `DriveApp.createFile` で一時ファイル作成。
  3. `createOcrDocFile`: Drive API で Google Docs へOCR変換（ja指定）。
  4. `DocumentApp.openById` でテキスト抽出。
  5. ドキュメント一時ファイルをゴミ箱移動（`setTrashed(true)`）。
  6. 正規表現・キーワードセクション分割によるメタ情報・部品抽出。
  7. 個別補正マップ（`applyOcrCorrections`）の照合・適用。
  8. `saveOcrToSheet`: 「シチズンマシナリー作業報告書」シートへ書き込み。
  9. 一時PDFファイルをゴミ箱移動。
- 転記時:
  - 抽出機番（`machineNo`）から `MachineMaster` の `machine_serial` / `machine_id` を部分一致検索し号機を特定。
  - 作業日を `YYYY-MM-DD` にフォーマット。
  - 【状況】【調査内容】【処置】を改行結合して `work_content` にセット。
  - 部品配列を `selected_parts` に代入し、入力タブ（`tab = 'input'`）へ自動遷移。

---

## 3.3 既存資産の潜在的課題・脆弱性分析 (GAP Analysis & Technical Debt)

| 区分 | 課題内容 | リスク / 影響度 | 推奨改善策 |
| :--- | :--- | :--- | :--- |
| **API / 依存性** | Google Drive API (v2 / v3) の明示的なサービス有効化が必要 | 新規環境デプロイ時にOCR処理が実行時エラーとなる高リスク | `appsscript.json` での明確な依存宣言、またはCloud Vision API等のREST直接呼出への移行 |
| **例外安全** | 一時ファイル削除が `DriveApp.getFileById(id).setTrashed(true)` のみ | エラー発生時にGoogle Drive内にゴミファイル（temp_ocr_*）が残留・容量圧迫 | トランザクション追跡と孤立一時ファイルの一括パージ処理の整備 |
| **保守性** | OCR補正ロジック（`applyOcrCorrections`）に特定の作業番号がハードコード | 新たな補正が必要な度にコード修正が発生する重大な技術負債 | 補正ルール用の専用スプレッドシート（`OcrCorrectionMaster`）を新設して外出し管理 |
| **データ構造** | `MaintenanceLog` の部品と数量がパイプ区切り文字列（`|`）で格納 | 結合検索や集計（どの部品が何個使われたか）が著しく困難 | リレーショナルな `MaintenancePartDetail` シートへの正規化、またはJSON文字列化 |
| **パフォーマンス** | クライアント起動時に全マスタ・全履歴を毎回全件ロード | 履歴件数が数千件に達した際にGAS実行時間制限（6分）および画面表示遅延 | サーバー側でのページネーション・日付範囲絞り込みクエリの導入 |
| **型安全性** | 純粋なJavaScript/GASで実装されており型注釈が皆無 | プロパティ名の不一致（例: `Machine_type` と `machine_type` の表記揺れ）によるバグ温存 | **【本要件で対応完了】** Google Apps Script (V8) + TypeScript (clasp) 構成を導入し、厳格な静的型検査（`tsc --noEmit`）と決定論的テストを実施 |

---

## 4. 決定論的受け入れ基準 (Deterministic Acceptance Criteria)

### AC-01: 閲覧タブにおけるメンテナンス履歴の複合フィルタと詳細表示
- **Given**: `MachineMaster` に号機 "NC001"（種別: "NC旋盤", 機種: "cincom B-12"）、`MaintenanceLog` に "NC001" の履歴2件、"WR001" の履歴1件が存在する。
- **When**: 閲覧画面で機械種類 "NC旋盤"、号機 "NC001" を選択し「表示」を実行する。
- **Then**: 
  1. 一覧には "NC001" の履歴2件のみが表示され、日付降順に並んでいること。
  2. 号機情報カードに機種 "cincom B-12"、種別 "NC旋盤" が正確に表示されること。
- **Stop Condition**: 単体テスト・E2E検証スクリプトでフィルタ結果の件数および表示属性が100%一致すること。

### AC-02: メンテナンス履歴の新規登録（排他制御と担当者自動登録）
- **Given**: `OperatorMaster` に存在しない新規担当者名 "山田太郎" をフォームに入力する。
- **When**: 号機 "NC001"、日付 "2024-05-20"、部品選択（P0001 x 2）を指定し「登録する」を実行する。
- **Then**:
  1. `LockService.getScriptLock()` が正常に取得・解放されること。
  2. `OperatorMaster` に新規ID（例: `OP001`）で "山田太郎" が自動追加されること。
  3. `MaintenanceLog` に一意なUUIDを持つ新規行が追加され、`part_number` がコード、`part_quantity` が "2" で保存されること。
- **Stop Condition**: バックエンド関数のモック検証で新規行が追加され、重複担当者登録が発生しないこと。

### AC-03: メンテナンス履歴の編集・更新（不変則の維持）
- **Given**: 既存の `MaintenanceLog` レコード（`log_id: "test-uuid-001"`, `input_timestamp: "2024/01/01 10:00:00"`）が存在する。
- **When**: 編集モードで `work_content` を "更新された作業内容" に変更して「更新する」を実行する。
- **Then**:
  1. 対象レコードの `work_content` が更新されること。
  2. 元の `input_timestamp`（"2024/01/01 10:00:00"）が書き換わらず不変であること。
- **Stop Condition**: 更新前後の `input_timestamp` が厳格に一致することを検証するテストがパスすること。

### AC-04: 新規機械マスタ登録時の空き連番サジェストとID自動算出
- **Given**: `MachineMaster` に NC旋盤として "NC001", "NC002", "NC004" が登録されている。
- **When**: 機械登録画面で機械種類 "NC旋盤"（コード: "NC"）を選択する。
- **Then**:
  1. 号機番号（`machine_id_No`）に最小の空き連番である `3` が自動サジェストされること。
  2. 機械ID（`machine_id`）に `NC003` が自動生成・反映されること。
- **Stop Condition**: 空き連番算出ロジック（`suggestNextMachineNo`）のユニットテストが全ケースパスすること。

### AC-05: 部品マスタの自動連番採番と新規登録
- **Given**: `PartMaster` に "P0001", "P0002" が存在し、最大連番が 2 である。
- **When**: 部品選択モーダルから新規部品 "主軸コレットチャック" を登録する。
- **Then**:
  1. 自動生成IDとして `P0003` が割り当てられること。
  2. `PartMaster` に新規部品が追記され、即座に選択中パーツリストに反映されること。
- **Stop Condition**: `addPartMasterData` の実行結果で `part_id: "P0003"` が返却されること。

### AC-06: サービスレポートPDFのOCR解析とログ保存
- **Given**: 作業番号 "10014958" を含む有効なサービスレポートPDFのBase64文字列。
- **When**: `runOcrOnBlob` を実行する。
- **Then**:
  1. 一時Doc変換を経てテキストが抽出され、一時ファイルが確実にゴミ箱に移動されること。
  2. `workNo`, `completionDate`, `modelType`, `machineNo`, `status`, `investigation`, `process`, `partsDetails` がパースされること。
  3. 「シチズンマシナリー作業報告書」シートに結果行が追記されること。
- **Stop Condition**: OCR結果オブジェクトの必須フィールドが空でないこと。

### AC-07: OCR解析結果から履歴入力フォームへの自動転記
- **Given**: OCR解析結果として `machineNo: "Z1234"`、`completionDate: "2024年5月20日"`、部品リストが返却されている。
- **When**: 「履歴入力フォームに転記する」ボタンを押下する。
- **Then**:
  1. `MachineMaster` の機番 "Z1234" に一致する号機が自動選択されること。
  2. 作業日付が "2024-05-20" にフォーマットされてセットされること。
  3. 作業内容に【状況】【調査内容】【処置】が結合されて反映されること。
  4. 抽出された交換部品および数量が `selected_parts` に展開されること。
- **Stop Condition**: 転記処理実行後の Alpine.js フォーム状態プロパティが期待値と完全一致すること。

### AC-08: テーマ切り替えとスプレッドシート連携
- **Given**: 初期テーマが "dark" である。
- **When**: テーマ切り替えスイッチを押下する。
- **Then**:
  1. `document.documentElement.dataset.theme` が "light" に切り替わり、`localStorage.getItem('theme')` に保存されること。
  2. 「スプレッドシートを開く」実行時に `getSpreadsheetUrl()` が正常なURLを返し、新規タブが開くこと。
- **Stop Condition**: DOM属性およびストレージ値の更新検証がパスすること。

### AC-09: Google Apps Script (V8) + TypeScript (clasp) 構成と決定論的検証
- **Given**: TypeScript で実装された GAS バックエンドコード（`src/` 配下）、型定義（`src/types/index.ts`）、設定ファイル（`tsconfig.json`, `.clasp.json`, `appsscript.json`, `package.json`）、およびテストコードが存在する。
- **When**: 決定論的検証コマンド（`npm run type-check`, `npm test`, `npm run build`, 空ファイル検証）を実行する。
- **Then**:
  1. `tsc --noEmit` による静的型検査がエラー0件で合格すること。
  2. Vitest による単体テストスイートがすべてパスすること。
  3. `dist/` に GAS V8 実行用のバンドルスクリプト（グローバルスコープ関数エクスポート含む）、`appsscript.json`、`index.html` が出力され、`.clasp.json` の `rootDir: "dist"` と整合すること。
  4. プロジェクト内にサイズ 0 バイトの空ファイルが存在しないこと（空ファイル自動検出を通過）。
- **Stop Condition**: 型検査、テスト、ビルド、空ファイルチェックの全プロセスが終了コード 0 で正常終了すること。

---

## 5. 極小タスク分解 (Atomic Tasks)

- [x] **Task 0: TypeScript (clasp) 環境およびビルド・テストパイプライン整備 (AC-09)**
  - `package.json`, `tsconfig.json`, `.clasp.json`, `appsscript.json`, ビルドスクリプトの作成。
  - Stop Condition: `npm run type-check`, `npm test`, `npm run build` が実行可能になること。（達成）
- [x] **Task 1: データスキーマ & 型定義の整備 (AC-09)**
  - `src/types/index.ts` の作成（Machine, Operator, Part, MaintenanceLog, OCRResult等）。
  - Stop Condition: `npm run type-check` または `tsc --noEmit` がノーエラーでパスすること。（達成）
- [x] **Task 2: GASバックエンドサービスのモジュール化 & 排他ロック機構の実装 (AC-02, AC-03, AC-05, AC-09)**
  - `MaintenanceService`, `MasterService` のTypeScript実装と排他制御ラッパー。
  - Stop Condition: 排他制御およびマスタ自動採番の単体テストがパスすること。（達成）
- [x] **Task 3: OCRパーサー・正規化モジュールのテスト駆動実装 (AC-06, AC-09)**
  - `OcrParser`（正規表現抽出、テキスト正規化、カナ変換、補正辞書）のユニットテスト作成と実装。
  - Stop Condition: 過去サンプルテキストに対する抽出テストが100%パスすること。（達成）
- [x] **Task 4: フロントエンド連携 & GASエントリーポイントの実装 (AC-01, AC-04, AC-07, AC-08, AC-09)**
  - `src/index.ts`（doGet, 各種公開関数）の実装と `dist/` へのバンドル出力・HTML同期。
  - Stop Condition: ビルド成果物に全公開関数が出力され、型検査・ビルドが成功すること。（達成）
- [x] **Task 5: 決定論的検証ループの実行と仕様書・構成図同期確認 (AC-09)**
  - `npm run type-check`, `npm test`, `npm run build`, 空ファイル検証の全合格確認。（達成）


