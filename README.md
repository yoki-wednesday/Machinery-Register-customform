# Machinery-Register-customform (大平テック機械台帳入力フォーム)

工作機械および給材機の基本台帳情報と日常・定期メンテナンス履歴を一元管理する Google Apps Script Webアプリケーションです。
メーカー作業報告書（サービスレポートPDF）のOCR自動解析機能および部品マスタ自動採番機能を備えています。

## 開発環境 & 技術スタック

- **ランタイム**: Google Apps Script (V8 Runtime)
- **言語**: TypeScript (v5.x 厳格モード)
- **管理ツール**: Google clasp (`@google/clasp`)
- **バンドラー**: esbuild
- **テストフレームワーク**: Vitest
- **フロントエンド**: HTML5, Tailwind CSS, DaisyUI, Alpine.js

## ディレクトリ構成

```text
├── specs/
│   └── Machinery-Register-customform/
│       ├── spec.md              # 構造化機能仕様書
│       └── architecture.html    # Archifyシステム・パイプライン視覚化
├── src/
│   ├── types/index.ts          # 型定義（マスタ、履歴、OCR、API）
│   ├── utils/TextUtils.ts      # テキスト正規化・CSVパーサー
│   ├── parsers/OcrParser.ts    # OCRセクション・メタデータ・部品解析
│   ├── services/
│   │   ├── MasterService.ts    # マスタ管理・連番採番・サジェスト
│   │   └── MaintenanceService.ts # メンテナンス履歴永続化・排他制御
│   └── index.ts                # GAS公開エントリポイント (doGet, RPC)
├── tests/                      # Vitest 決定論的単体テストスイート
├── scripts/                    # 検証・ビルドスクリプト
├── dist/                       # ビルド成果物 (clasp push 対象)
├── appsscript.json             # GASプロジェクトマニフェスト
├── .clasp.json                 # clasp設定ファイル
└── package.json
```

## 開発・検証コマンド

```bash
# 依存パッケージのインストール
npm install

# 静的型検査 (tsc --noEmit)
npm run type-check

# 単体テスト実行 (vitest)
npm test

# ビルド実行 (esbuild -> dist/)
npm run build

# 空ファイル検証
npm run check:empty

# 決定論的一括検証 (型検査 + テスト + ビルド + 空ファイル検証)
npm run verify
```

## GAS実装・セットアップ手順詳細

本システムを新規にGoogle Apps Script (GAS) 環境へ導入・構築し、Webアプリケーションとして公開・運用するまでの詳細手順です。

### Step 1: 前提環境とclaspの認証設定

1. **Google Apps Script API の有効化**:
   - ブラウザで [Google Apps Script ユーザー設定](https://script.google.com/home/usersettings) にアクセスします。
   - 「Google Apps Script API」のスイッチを **オン**（許可）に切り替えます（`clasp` によるリモート操作に必須です）。
2. **clasp へのログイン**:
   - ターミナルで以下のコマンドを実行し、Googleアカウントでブラウザ認証を行います。
     ```bash
     npx clasp login
     ```

### Step 2: Googleスプレッドシートの準備とスキーマ設計

本システムはGoogleスプレッドシートをデータベースとして利用します。Googleドライブ上で新規スプレッドシートを作成し、以下のシート構成を準備します。

| シート名 | 用途 | 必須ヘッダー（1行目） | 備考 |
| :--- | :--- | :--- | :--- |
| **`MachineMaster`** | 機械台帳マスタ | `machine_id`, `machine_id_No`, `machine_type`, `machine_model`, `machine_mfg_date`, `machine_serial`, `feeder_name`, `feeder_model`, `feeder_serial`, `feeder_mfg_date`, `remarks`, `created_date` | 空き連番・機械ID自動生成 |
| **`MachineTypeMaster`** | 機械種別マスタ | `machine_type`, `type_code` | 例: `NC旋盤` / `NC`, `割機` / `WR`, `ヒラキ機` / `HR`, `溝入機` / `MZ`, `自動組立機` / `AK`, `自動検査機` / `AI`, `エアコンプレッサー` / `AC` |
| **`OperatorMaster`** | 作業担当者マスタ | `operator_id`, `operator_name`, `created_date` | 履歴入力時に入力された新規担当者は自動追記 |
| **`PartMaster`** | 交換部品マスタ | `part_id`, `part_name`, `part_number`, `maker`, `machine_type`, `remarks` | シート未存在時は初期サンプル行付きで自動作成 |
| **`MaintenanceLog`** | メンテナンス履歴 | `log_id`, `machine_id`, `maintenance_date`, `work_content`, `part_number`, `remarks`, `input_timestamp`, `part_quantity`, `operator_name` | `log_id`はUUID自動採番、更新時は`input_timestamp`不変 |
| **`シチズンマシナリー作業報告書`** | OCR抽出ログ | `作業番号`, `作業完了日`, `機種型式`, `機番`, `納入日`, `状況`, `原因`, `処置`, `連絡事項`, `交換部品1`〜`交換部品10`, `OCR解析ステータス`, `OCR生テキスト`, `OCR解析実行日` | OCR実行時にシート未存在なら自動生成 |

### Step 3: GASプロジェクトの紐付け (`.clasp.json`)

1. **スクリプトIDの取得**:
   - 作成したスプレッドシートのメニューバーから **[拡張機能]** > **[Apps Script]** を選択してエディタを開きます（コンテナバインドスクリプト）。
   - 左サイドバーの **[プロジェクトの設定]**（歯車アイコン）をクリックします。
   - 表示された **「スクリプト ID」** をコピーします。
2. **プロジェクト設定の更新**:
   - リポジトリ直下の `.clasp.json` を開き、取得したスクリプトIDを設定します。
     ```json
     {
       "scriptId": "YOUR_ACTUAL_SCRIPT_ID_HERE",
       "rootDir": "dist"
     }
     ```

### Step 4: Google Drive API (拡張サービス) の有効化

サービスレポートPDFや画像に対する日本語OCR（文字認識）機能を利用するため、GASプロジェクト側で Drive API を有効化します。

1. GASエディタの左サイドバー **「サービス」** の横にある **[+]** ボタンをクリックします。
2. 一覧から **「Drive API」** を選択します。
3. バージョンを **`v2`**、識別子を **`Drive`** に設定し、**[追加]** をクリックします。
   > [!NOTE]
   > マニフェスト（`appsscript.json`）にはすでに Drive v2 依存設定が含まれていますが、GASエディタ上のサービス追加も合わせて確認してください。

### Step 5: ローカルビルド & GASへのプッシュ

TypeScriptコードを esbuild でバンドルし、GASプロジェクトへプッシュします。

```bash
# 1. 決定論的検証 (型検査 + 単体テスト + ビルド + 空ファイル検証)
npm run verify

# 2. ビルド成果物 (dist/Code.js, dist/index.html, dist/appsscript.json) を GAS へ転送
npm run push
```

> [!TIP]
> `npm run build` により、TypeScriptがIIFE形式にバンドルされ、GAS公開関数（`doGet`, `addMaintenanceLog` など）のトップレベルラッパーが自動付与されます。

### Step 6: 初回Webアプリデプロイ & アクセス権限の承認

1. **初回デプロイの作成**:
   - ターミナルから以下のコマンドを実行します:
     ```bash
     npx clasp deploy -d "初回デプロイ"
     ```
   - または、GASエディタ右上の **[デプロイ]** > **[新しいデプロイ]** を選択します:
     - **種類の選択**: 「ウェブアプリ」
     - **説明**: `v1.0.0`
     - **次のユーザーとして実行**: `自分` (`USER_DEPLOYING`)
     - **アクセスできるユーザー**: `全員` または `組織内の全員`
     - **[デプロイ]** をクリック。
2. **OAuth権限の承認（初回実行時のみ）**:
   - デプロイ完了後、WebアプリURLを開くか、GASエディタ上で任意の関数を実行した際に「承認が必要です」のダイアログが表示されます。
   - アカウントを選択し、警告画面が表示されたら **「詳細を表示」** > **「〇〇（安全ではないページ）に移動」** をクリックして、スプレッドシート・ドライブ・ドキュメントの操作権限を「許可」します。

### Step 7: 固定デプロイIDの登録と環境別デプロイ運用

GASのWebアプリケーションURLを固定したまま継続的に更新するため、固定デプロイID運用を採用しています。

1. **デプロイIDの確認**:
   ```bash
   npx clasp deployments
   ```
   上記コマンドで表示されるデプロイ一覧から、該当の `Deployment ID` をコピーします。
2. **`package.json` のデプロイ先更新**:
   `package.json` の `scripts` に記載されているプレースホルダーを取得したIDに置き換えます。
   ```json
   "scripts": {
     "deploy:gas:dev": "npm run push && clasp deploy -i <DEV_DEPLOYMENT_ID> -d \"dev deploy\"",
     "deploy:gas:prod": "npm run push && clasp deploy -i <PROD_DEPLOYMENT_ID> -d \"prod deploy\""
   }
   ```
3. **継続デプロイの実行**:
   コード変更後は、以下のコマンド1発でビルド・プッシュ・Webアプリへの反映が完了します（WebアプリURLは変わりません）。
   ```bash
   # 開発環境への反映
   npm run deploy:gas:dev

   # 本番環境への反映
   npm run deploy:gas:prod
   ```

### Step 8: トラブルシューティング & 運用上の注意事項

- **Drive API エラー (`ReferenceError: Drive is not defined` / `OCR変換の実行に失敗しました`)**:
  - Step 4 の GAS 拡張サービス「Drive API (v2)」が追加・有効化されているか確認してください。
- **排他制御エラー (`ロックを取得できませんでした`)**:
  - 本システムでは同時書き込みによるデータ破損を防ぐため、`LockService`（最大30秒待機）を使用しています。他のユーザーが書き込み中の場合はしばらく待ってから再実行してください。
- **シート名不一致エラー**:
  - スプレッドシート内のシート名（`MachineMaster`, `MachineTypeMaster`, `MaintenanceLog` 等）が大文字・小文字を含め完全一致しているか確認してください。
- **実行時間制限**:
  - Google Apps Script の1回あたりのスクリプト実行上限は通常アカウントで6分、Workspaceアカウントで30分です。巨大なPDFファイルのOCR解析を行う際は、1ファイルあたり10MB以下を目安としてください。


