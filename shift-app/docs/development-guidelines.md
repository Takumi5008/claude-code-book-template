# 開発ガイドライン（Development Guidelines）

## コーディング規約

### 共通
- インデント：スペース2つ
- 文字コード：UTF-8
- 改行コード：LF
- セミコロン：あり
- クォート：シングルクォート

### JavaScript / JSX
- ESModules（`import/export`）を使用
- `const` を基本とし、再代入が必要な場合のみ `let`
- `var` は使用禁止
- 非同期処理は `async/await` を使用

---

## 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `ShiftCalendar.jsx` |
| 関数・変数 | camelCase | `getShifts()` |
| 定数 | UPPER_SNAKE_CASE | `MAX_MEMBERS` |
| DBテーブル・カラム | snake_case | `work_dates`, `created_at` |
| APIパス | kebab-case | `/api/push/subscribe` |

---

## スタイリング規約

- **Tailwind CSS** を使用
- インラインスタイルは原則禁止
- コンポーネント固有のスタイルはTailwindクラスで完結させる

---

## セキュリティ規約

- パスワードは必ず `bcrypt`（saltRounds: 10）でハッシュ化
- セッションCookieは `httpOnly: true`, `sameSite: 'strict'` を設定
- APIレスポンスにパスワードハッシュを含めない
- 管理者専用エンドポイントは `requireAdmin` ミドルウェアで保護
- メンバーは自分の `user_id` に紐づくデータのみ操作可能

---

## Git規約

### ブランチ戦略
```
main          本番相当ブランチ
feature/xxx   機能追加
fix/xxx       バグ修正
```

### コミットメッセージ
```
feat: シフト入力カレンダーを追加
fix: 締切設定が保存されない問題を修正
chore: パッケージを更新
```

---

## テスト規約

- APIエンドポイントは手動でcurlまたはブラウザで動作確認
- フロントエンドはブラウザで主要フロー（ログイン・シフト入力・管理者確認）を確認
- Phase 3完了後に結合テストを検討

---

## 環境変数

`server/.env` に以下を定義（Gitにコミットしない）：

```
SESSION_SECRET=ランダムな文字列
VAPID_PUBLIC_KEY=Web Push公開鍵
VAPID_PRIVATE_KEY=Web Push秘密鍵
VAPID_MAILTO=mailto:admin@example.com
PORT=3001
```
