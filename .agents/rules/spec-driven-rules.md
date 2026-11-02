# Spec-Driven Development (SDD) Guidelines & Architecture Constraints

AIコーディングにおける「意図のズレ」「暗黙の前提欠落」「際限のないリファクタリング」を最小化するための設計工学ガイドライン。

---

## 1. 3大コア原則 (Core Principles)

1. **仕様をコンパイル入力とする（Specification as Machine-Readable Input）**
   - コードはプロンプトの勢い（Vibe Coding）ではなく、構造化された仕様（Requirements / Design / Tasks）から機械的に導出（トランスレート）される成果物とする。
   - `specs/` 配下の仕様書が存在しない新規コードの直接生成を禁止する。

2. **決定論的検証ループの義務化（Mandatory Deterministic Verification Loop）**
   - 人間の目視レビューやAIの主観判定（LLM-as-a-Judge）のみに依存せず、**型システム・静的解析（Linter/AST）・契約テスト（Given-When-Then）**による機械的・決定論的チェックを通過することを完了条件とする。
   - コンパイルエラー・型エラー・テスト失敗ログは、自己修正（Self-Correction）ループへの入力として自動フィードバックする。

3. **タスクの極小化と単一責務同期（1-Todo = 1-Commit = 1-Spec-Update）**
   - 実装タスクは「仕様の受け入れ基準1項目」に対応する極小単位に分解する。
   - 設計変更や仕様差分が発生した場合は、コード先行でのアドホック修正を禁止し、**必ず「仕様書更新 → 検証更新 → コード実装」**の順序を遵守する。

---

## 2. 非エンジニア対話プロトコル（Step 1〜6 定型プロンプト検知）

ユーザーから `【Step X】` 接頭辞を含むプロンプトが入力された場合、以下のモードで自律的にハンドリングする：

- **【Step 1: 仕様作成】検知時**:
  - プロジェクト種別（GAS+TS / Web / Python / Blank）の要件を汲み取り、不明点を3〜5問の選択肢付きで質問し、`specs/<feature>/spec.md` の草案を生成する。
- **【Step 2: 仕様確定】検知時**:
  - 回答を反映し、「In Scope」「Out of Scope」「決定論的受け入れ基準（AC）」を仕様書に確定する。
- **【Step 3: 構成図・フロー図の視覚化】検知時**:
  - 確定仕様に基づき、Archify形式のインタラクティブHTML（`specs/<feature>/architecture.html`）を生成。システム構成図またはデータフロー図を視覚化する。
- **【Step 4: 計画作成】検知時**:
  - 極小タスク計画（各タスクに型検査・テストのStop Conditionを付与）を作成し、計画アーティファクトを提示する。
- **【Step 5: 実装と検証ループ】検知時**:
  - コード生成、静的型チェック（tsc/mypy等）、テスト実行、および自己修正（最大3回）をバックグラウンドで完結させ、結果のみを平易に報告する。GASの場合は `dist/` 出力および固定デプロイ構成を検証する。
- **【Step 6: 最終確認】検知時**:
  - 受け入れ基準との一致を照合し、動作確認手順やデプロイ手順（Webアプリのプレビュー、またはGAS標準コマンド npm run deploy:gas:dev / npm run deploy:gas:prod による固定デプロイID反映、README.mdのデプロイガイド案内）を案内する。
