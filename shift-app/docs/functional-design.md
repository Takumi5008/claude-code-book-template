# 機能設計書（Functional Design Document）

## システム構成

```
[ブラウザ]
    ↕ HTTP / Web Push
[Express APIサーバー]
    ↕
[SQLite DB]
```

- **Frontend:** React + Vite（SPA）
- **Backend:** Express.js（REST API）
- **DB:** SQLite（better-sqlite3）
- **認証:** express-session + bcrypt
- **通知:** Web Push API（web-push ライブラリ）

---

## 画面構成・遷移図

```
ログイン画面
    │
    ├─→【メンバー】シフト入力画面
    │       月カレンダー表示
    │       日付クリックで○/×切り替え
    │       送信ボタンで確定
    │
    └─→【管理者】ダッシュボード
            全員シフト一覧（表形式）
            締切設定フォーム
            未提出者一覧
```

---

## データモデル（ER図）

```
users
  id          INTEGER PK
  name        TEXT
  email       TEXT UNIQUE
  password    TEXT (bcryptハッシュ)
  role        TEXT (admin / member)
  push_subscription TEXT (JSON, nullable)
  created_at  DATETIME

shifts
  id          INTEGER PK
  user_id     INTEGER FK → users.id
  year        INTEGER
  month       INTEGER
  work_dates  TEXT (JSON配列: [1,5,10,15,...])
  submitted   INTEGER (0=未提出 / 1=提出済)
  updated_at  DATETIME

deadlines
  id          INTEGER PK
  year        INTEGER
  month       INTEGER
  deadline_at DATETIME
  created_at  DATETIME
```

---

## API設計

### 認証
| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/auth/login | ログイン |
| POST | /api/auth/logout | ログアウト |
| GET | /api/auth/me | ログイン中ユーザー取得 |

### シフト
| メソッド | パス | 説明 | 権限 |
|----------|------|------|------|
| GET | /api/shifts/my?year=&month= | 自分のシフト取得 | member/admin |
| POST | /api/shifts/my | 自分のシフト保存 | member/admin |
| GET | /api/shifts/all?year=&month= | 全員のシフト取得 | admin |

### 締切
| メソッド | パス | 説明 | 権限 |
|----------|------|------|------|
| GET | /api/deadlines?year=&month= | 締切取得 | 全員 |
| POST | /api/deadlines | 締切設定 | admin |

### 通知
| メソッド | パス | 説明 |
|----------|------|------|
| POST | /api/push/subscribe | Push購読登録 |
| POST | /api/push/unsubscribe | Push購読解除 |

---

## コンポーネント設計

### Frontend

```
src/
  components/
    LoginForm.jsx        ログインフォーム
    ShiftCalendar.jsx    月カレンダー（出勤日選択）
    AdminTable.jsx       全員シフト一覧表
    DeadlineForm.jsx     締切設定フォーム
    UnsubmittedList.jsx  未提出者一覧
  pages/
    LoginPage.jsx
    MemberPage.jsx       メンバー用ページ
    AdminPage.jsx        管理者用ページ
  hooks/
    useAuth.js           認証状態管理
    usePush.js           Push通知購読管理
  App.jsx                ルーティング
```

### Backend

```
server/
  index.js              エントリーポイント
  db.js                 SQLite接続・マイグレーション
  routes/
    auth.js
    shifts.js
    deadlines.js
    push.js
  middleware/
    auth.js             セッション確認・ロール確認
  push/
    scheduler.js        締切1時間前の通知スケジューラー
```

---

## Web Push通知フロー

```
1. メンバーがログイン
2. ブラウザが通知許可を要求（初回のみ）
3. 許可されたらPush購読情報をサーバーに登録
      → users.push_subscription に保存

4. サーバーのスケジューラーが1分ごとに確認
      → 締切まで1時間以内 かつ 未通知 かつ 未提出 のメンバーを検索
      → web-pushで通知送信

5. メンバーのブラウザにプッシュ通知が届く
6. クリックするとシフト入力画面を開く
```

---

## セキュリティ方針

- パスワードはbcryptでハッシュ化して保存
- セッションIDはHTTPOnly Cookieで管理
- `/api/shifts/all`・`/api/deadlines POST`はadminロールのみアクセス可
- メンバーは自分のshiftのみ読み書き可（user_idで制限）
