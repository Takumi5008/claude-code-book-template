# 初回実装 設計

## 実装アプローチ

1. `server/` をセットアップ（Express + SQLite + 認証）
2. `client/` をセットアップ（React + Vite + Tailwind）
3. 認証フロー実装（ログイン・ログアウト・セッション）
4. シフトCRUD実装（メンバー入力・管理者一覧）
5. 動作確認

## 変更するコンポーネント

### 新規作成（server）
- `server/package.json`
- `server/index.js`
- `server/db.js`
- `server/routes/auth.js`
- `server/routes/shifts.js`
- `server/middleware/auth.js`

### 新規作成（client）
- `client/package.json`
- `client/vite.config.js`
- `client/index.html`
- `client/src/App.jsx`
- `client/src/api/client.js`
- `client/src/hooks/useAuth.js`
- `client/src/pages/LoginPage.jsx`
- `client/src/pages/MemberPage.jsx`
- `client/src/pages/AdminPage.jsx`
- `client/src/components/ShiftCalendar.jsx`
- `client/src/components/AdminTable.jsx`

## データ構造

```sql
-- Phase 1で使用するテーブル
users: id, name, email, password, role, created_at
shifts: id, user_id, year, month, work_dates, submitted, updated_at
```

## Viteプロキシ設定

```js
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

## 影響範囲
- `hkr-app/` には一切干渉しない
- `shift-app/` 配下のみ変更
