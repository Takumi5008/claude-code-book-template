# リポジトリ構造定義書（Architecture Document）

## ディレクトリ構成

```
hkr-app/
├── docs/                          # 永続的ドキュメント
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── development-guidelines.md
│   └── glossary.md
├── .steering/                     # 作業単位のドキュメント
│   └── [YYYYMMDD]-[タイトル]/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
├── client/                        # Reactフロントエンド
│   ├── public/
│   │   └── sw.js                  # Service Worker（Web Push受信）
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── ShiftCalendar.jsx
│   │   │   ├── AdminTable.jsx
│   │   │   ├── DeadlineForm.jsx
│   │   │   └── UnsubmittedList.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── MemberPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── usePush.js
│   │   ├── api/
│   │   │   └── client.js          # APIリクエスト共通関数
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                        # Expressバックエンド
│   ├── index.js                   # エントリーポイント
│   ├── db.js                      # SQLite接続・マイグレーション
│   ├── routes/
│   │   ├── auth.js
│   │   ├── shifts.js
│   │   ├── deadlines.js
│   │   └── push.js
│   ├── middleware/
│   │   └── auth.js                # セッション確認・ロール確認
│   ├── push/
│   │   └── scheduler.js           # 通知スケジューラー
│   └── package.json
└── package.json                   # ルートスクリプト（起動コマンド）
```

---

## ディレクトリの役割

| ディレクトリ | 役割 |
|-------------|------|
| `client/` | Reactフロントエンド一式 |
| `client/src/components/` | 再利用可能なUIコンポーネント |
| `client/src/pages/` | ページ単位のコンポーネント（ルーティング対象） |
| `client/src/hooks/` | カスタムフック（認証・Push通知状態管理） |
| `client/src/api/` | バックエンドAPIとの通信処理 |
| `client/public/sw.js` | Service Worker（Push通知受信・クリック処理） |
| `server/` | Expressバックエンド一式 |
| `server/routes/` | APIルート定義 |
| `server/middleware/` | 認証・認可ミドルウェア |
| `server/push/` | 通知スケジューラー（定期実行） |

---

## 起動コマンド

```bash
# フロントエンド（client/）
npm run dev       # Vite開発サーバー（ポート5173）

# バックエンド（server/）
npm run server    # Expressサーバー（ポート3001）
```

Viteの開発プロキシで`/api`をポート3001に転送する設定を`vite.config.js`に記述する。

---

## ファイル配置ルール

- コンポーネントは機能単位で`components/`に配置、ページ全体は`pages/`に配置
- API通信は`src/api/client.js`に集約し、各コンポーネントから直接`fetch`しない
- DBアクセスは`server/db.js`に集約し、ルートファイルからは関数呼び出しのみ
- Service Workerは`client/public/sw.js`に配置（ビルド時にルートに出力される）
