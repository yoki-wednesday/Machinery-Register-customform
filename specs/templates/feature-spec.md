# 機能仕様書: [機能識別子 / feature-slug]

## 1. 要求とスコープ (Requirements & Scope)
- **背景 & 目的**: [解決する課題とビジネス/システム上のゴール]
- **対象 (In Scope)**:
  - ユーザーができること / システムが果たす振る舞い
- **対象外 (Out of Scope)**:
  - 今回実装しないこと（AIの過剰実装・スコープクリープを防止）

## 2. 制約条件・アーキテクチャ境界 (Constitution & Invariants)
- **不変則 (Invariants)**: [絶対に壊してはならない既存動作・データ整合性]
- **依存関係 / 技術制約**: [禁止されるライブラリ、アーキテクチャ上の責務分離規約]

## 3. 技術設計 & コントラクト (Technical Design & Contracts)
### 3.1 データモデル / インターフェース定義
```typescript
// 厳格な型定義・スキーマ定義（コンパイラが検証可能な入力）
```

### 3.2 状態遷移 & エラーハンドリング
- 正常系・異常系・境界条件の入出力定義

## 4. 決定論的受け入れ基準 (Deterministic Acceptance Criteria)
各基準はテストコードまたはLinterで100%機械判定できる形で記述する。

- [ ] **AC-1: [シナリオ名 (正常系)]**
  - **Given**: [前提条件・初期状態]
  - **When**: [入力操作・API呼出]
  - **Then**: [期待される状態・返却値・DB更新]
  - **Stop Condition**: `npm run test -- -t "AC-1"` がパスすること
- [ ] **AC-2: [シナリオ名 (境界値 / エラー系)]**
  - **Given**: [不正データ / 異常状態]
  - **When**: [操作実行]
  - **Then**: [エラーコード・ハンドリング挙動]
  - **Stop Condition**: 型チェックおよび該当テストがパスすること

## 5. 極小タスク分解 (Atomic Tasks)
*1 Todo = 1 Spec Update = 1 Deterministic Verification*
- [ ] Task 1: 型定義 & インターフェースの作成 (`npm run type-check`)
- [ ] Task 2: AC-1 に対するテストケース記述と実装 (`npm test`)
- [ ] Task 3: AC-2 に対するテストケース記述と実装 (`npm test`)
- [ ] Task 4: 仕様書との最終整合性チェック (Spec-Code Sync Verification)
