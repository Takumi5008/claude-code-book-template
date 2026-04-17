# 初回実装 タスクリスト

## Phase 1（MVP）

### サーバーセットアップ
- [ ] `server/package.json` 作成（express, better-sqlite3, bcrypt, express-session, cors）
- [ ] `server/db.js` 作成（SQLite接続・テーブル作成・マイグレーション）
- [ ] `server/middleware/auth.js` 作成（セッション確認・ロール確認）
- [ ] `server/routes/auth.js` 作成（login, logout, me）
- [ ] `server/routes/shifts.js` 作成（my GET/POST, all GET）
- [ ] `server/index.js` 作成（Express起動・ルート登録）

### クライアントセットアップ
- [ ] `client/package.json` 作成（react, vite, tailwindcss）
- [ ] `client/vite.config.js` 作成（/apiプロキシ設定）
- [ ] Tailwind CSS設定
- [ ] `client/src/api/client.js` 作成（fetch共通関数）
- [ ] `client/src/hooks/useAuth.js` 作成（認証状態管理）

### 画面実装
- [ ] `LoginPage.jsx` 実装（メール・パスワード入力フォーム）
- [ ] `ShiftCalendar.jsx` 実装（月カレンダー・出勤日選択・送信）
- [ ] `MemberPage.jsx` 実装（ShiftCalendarを表示）
- [ ] `AdminTable.jsx` 実装（全員×全日付の表形式）
- [ ] `AdminPage.jsx` 実装（AdminTableを表示）
- [ ] `App.jsx` 実装（ルーティング・ロール振り分け）

### 動作確認
- [ ] サーバー起動・API動作確認
- [ ] メンバーログイン→シフト入力→提出
- [ ] 管理者ログイン→全員シフト一覧確認
- [ ] ログアウト後のアクセス制限確認

## Phase 2（締切機能）※後回し
- [ ] `deadlines` テーブル追加
- [ ] `server/routes/deadlines.js` 実装
- [ ] `DeadlineForm.jsx` 実装
- [ ] `UnsubmittedList.jsx` 実装

## Phase 3（Web Push通知）※後回し
- [ ] Service Worker（`sw.js`）実装
- [ ] `server/routes/push.js` 実装
- [ ] `server/push/scheduler.js` 実装
- [ ] `client/src/hooks/usePush.js` 実装
