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

## デプロイ運用（固定デプロイID）

```bash
# 開発環境への固定デプロイ
npm run deploy:gas:dev

# 本番環境への固定デプロイ
npm run deploy:gas:prod
```

