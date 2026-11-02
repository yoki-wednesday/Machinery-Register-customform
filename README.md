# Antigravity SDD Project Template

非エンジニア向けの **SDD（仕様駆動開発: Specification-Driven Development）** と **決定論的検証ループ** を即座に開始できるプロジェクトテンプレートです。

## 含まれる構成

- **`users/users-guide.html`**:
  - 非エンジニア向けプロンプト自動生成コンソール（最新レシピ・Google連携・モデル推奨ガイド対応）
- **`.agents/skills/`**:
  - `non-engineer-sdd`: Step 0〜6 の定型プロンプトエスコート
  - `spec-authoring`: 構造化仕様書（In/Out Scope, 不変則, 受入基準）の生成・同期
  - `deterministic-verification`: 静的解析・テスト・決定論的自己修復ループ
  - `archify`: HTML/SVGによるアーキテクチャ・フローの可視化
- **`specs/templates/feature-spec.md`**:
  - 標準仕様書フォーマット
- **`.gitignore`**:
  - Node/Python/GAS/エディタ設定等の不要ファイル除外

## クイックスタート

1. GitHub上で本リポジトリ右上の **[Use this template]** -> **[Create a new repository]** をクリックして新規リポジトリを作成します。
2. Antigravity IDEで作成したリポジトリを開きます。
3. **README.md のリネームと新規作成**:
   - 本テンプレートの `README.md` を `README_TEMPLATE.md` 等にファイル名を変更します（テンプレートの使い方やGASデプロイ手順を参照用として手元に残すため）。
   - プロジェクトルートに新規で `README.md` を作成し、これから開発するアプリ・プロダクトの概要やセットアップ方法を記述します。
4. `users/users-guide.html` をブラウザで開き、画面の手順（Step 0〜6）に沿ってプロンプトをAntigravity IDEに送信して開発を開始します。

## モデル推奨設定

各ステップで以下の推奨モデルに切り替えて実行することで、コストと精度のバランスを最適化できます。
- **Step 0〜1 (要件定義・仕様生成)**: Gemini 3.8 Flash (Low) または High
- **Step 2 (設計・Archify視覚化)**: Gemini 3.8 Flash (Low)
- **Step 3 (決定論的テスト作成)**: Gemini 3.8 Flash (Low)
- **Step 4 (実装)**: Gemini 3.8 Flash (Low)
- **Step 5 (自己修復・検証ループ)**: Gemini 3.8 Flash (Low)
- **Step 6 (デプロイ)**: Gemini 3.8 Flash (Low)

---

## GAS（Google Apps Script）標準デプロイ運用

本テンプレートのGASレシピでは、低レベルな `clasp` コマンドを直接叩く運用を廃止し、`package.json` に定義されたワンコマンドで安全にビルドからデプロイまで完結する運用を標準としています。

### 1. 標準デプロイコマンド一覧

| コマンド | 対象環境 | 説明 |
| :--- | :--- | :--- |
| `npm run deploy:gas:dev` | 開発環境 (dev) | コードをビルド・Pushし、開発用固定デプロイIDに反映します。 |
| `npm run deploy:gas:prod` | 本番環境 (prod) | コードをビルド・Pushし、本番用固定デプロイIDに反映します。 |
| `npm run deploy:gas` | 開発環境 (エイリアス) | デフォルトのデプロイコマンド（`deploy:gas:dev` を実行）。 |

### 2. 固定デプロイID運用のメリット
- **WebアプリURLが不変**: デプロイごとにURLが変わらず、共有リンクやブックマークの再配布が不要です。
- **開発・本番の分離**: 本番稼働中のスクリプトに影響を与えず、開発用Webアプリで検証できます。

### 3. `package.json` の設定例

```json
{
  "scripts": {
    "build": "tsc && node build.js",
    "push": "npm run build && clasp push",
    "deploy:gas:dev": "npm run push && clasp deploy -i <DEV_DEPLOYMENT_ID> -d \"dev deploy\"",
    "deploy:gas:prod": "npm run push && clasp deploy -i <PROD_DEPLOYMENT_ID> -d \"prod deploy\"",
    "deploy:gas": "npm run deploy:gas:dev"
  }
}
```

> **固定デプロイIDの初回取得手順**:
> 1. `npx clasp deploy -d "初回デプロイ"` を実行します。
> 2. 発行された Deployment ID（または `npx clasp deployments` で確認できるID）をコピーし、上記 `<DEV_DEPLOYMENT_ID>` / `<PROD_DEPLOYMENT_ID>` に設定してください。

