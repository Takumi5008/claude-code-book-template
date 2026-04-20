# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repo contains two independent projects used as examples for a Claude Code book:

- **`todo/`** — React + Vite frontend with an Express/SQLite backend (タスク管理 UI)
- **`devtask/`** — Node.js CLI tool for developer task management with auto-priority detection

A Playwright MCP server is configured in `.mcp.json` for browser-based testing.

---

## `todo/` — React Todo App

### Commands (run from `todo/`)
```bash
npm run dev       # Start Vite dev server (frontend, HMR)
npm run server    # Start Express API server on port 3001
npm run build     # Production build
npm run lint      # ESLint
```

### Architecture
- **Frontend:** `src/App.jsx` — single-component React app using `useState`/`useEffect`. All task state is server-authoritative; every mutation calls the REST API and updates local state from the response.
- **Backend:** `server/index.js` — Express app with SQLite (`better-sqlite3`). DB file at `server/tasks.db`. Handles migrations via `PRAGMA table_info` on startup.
- **API:** REST endpoints at `/api/tasks` (GET, POST) and `/api/tasks/:id` (PATCH, DELETE).
- **Dev setup:** Run both `npm run dev` and `npm run server` concurrently. Vite proxies are not configured; the frontend calls `localhost:3001` directly (CORS is enabled on the server).

Task fields: `id`, `text`, `done` (boolean), `priority` (high/medium/low), `created_at`.

---

## `devtask/` — CLI Tool

### Commands (run from `devtask/`)
```bash
node bin/devtask.js --help             # Show help
node bin/devtask.js add "text"         # Add task (auto-detects priority)
node bin/devtask.js list               # List active tasks
node bin/devtask.js next               # Show top-scored tasks to work on
node bin/devtask.js done <id>          # Mark task complete
node bin/devtask.js edit <id>          # Edit task
node bin/devtask.js delete <id>        # Delete task
DEBUG=devtask node bin/devtask.js ...  # Enable debug logging
```

### Architecture
- **Entry point:** `bin/devtask.js` — CLI setup via `commander`, wires subcommands to handlers.
- **Commands:** `src/commands/{add,list,next,done,edit,delete}.js` — one file per subcommand.
- **Database:** `src/db.js` — SQLite via `better-sqlite3`, stored at `~/.devtask/tasks.db`. Exports all CRUD functions and schema validation helpers. Schema migrations via `PRAGMA table_info` check on startup.
- **Priority logic:** `src/priority.js` — keyword-based auto-detection (deadline > keyword > default). High-priority keywords include bug/error/fix/バグ/緊急; low-priority keywords include refactor/docs/リファクタ.
- **UI rendering:** `src/ui.js` — colored terminal output using `chalk` (high=red, medium=yellow, low=green).
- **Scoring (`next` command):** `score = priority_base + deadline_bonus + staleness_bonus` (see SPEC.md §6.1 for exact values).
- **Package type:** ESM (`"type": "module"`) — use `.js` extensions in all imports.

### Data model (SQLite)
```
tasks: id, text, done, priority, priority_reason, priority_manual, tags, due_date, created_at, done_at
```
`priority_manual=1` means user overrode auto-detection; `edit --text` skips re-detection when manual is set.

### Full spec
`devtask/SPEC.md` — product requirements document (v1.1.0, approved). Defines all command options, error messages (in Japanese), scoring algorithm, tag constraints, and the v1/v2/v3 roadmap.
##概要
開発を始める上で遵守すべきルールを定義します

##プロジェクト構造
本リポジトリは、タスク管理アプリケーション専用のリポジトリです

###ドキュメントの分類

####1.永久ドキュメント('docc/')
アプリケーション全体の「**何を作るか」「**どう作るか**」を定義する恒久的なドキュメント
アプリケーションの基本設計や方針が変わらない限り更新されません

-**product-requirements.md**-プロダクト要求定義署
 -プロダクトビジョンと課題・ニーズ
 -主要な機能一覧
 -成功の定義
 -ビジネス要件
 -ユーザーストーリー
 -受け入れ条件
 -機能要件
 -非機能要件

-**functional-design.md**-機能設計書
 -機能ごとのアーキテクチャ
 -システム構成図
 -データモデル定義(ER図含む)
 -コンポーネント設計
 -ユースケース図、画面遷移図、ワイヤフレーム
 -API設計(将来的にバックエンドと連携する部分)

-**architecture.md**-リポジトリ構造定義書
 -フォルダ・ファイル構成
 -ディレクトリの役割
 -ファイル配置ルール

-**development-guidelines.md**-開発ガイドライン
 -コーディング規約
 -命令規則
 -スタイリング規約
 -テスト規約
 -Git規約

-**glossary.md**-ユピキタス言語定義
 -ドメイン用語の定義
 -ビジネス用語の定義
 -UI/UX用語の定義
 -英語・日本語対応表
 -コード上の命令規約

####2.作業単位のドキュメント('streering/[yyyymmdd]-[開発タイトル]/')

特定の開発作業における「**今回何をするか**」を定義する一時的なステアリングファイル
作業完了後は参照用として保持されますが、新しい作業では新しいディレクトリを作成します

-**requirements.md**-今回の作業の要求内容
 -変更・追加する機能の説明
 -ユーザーストーリー
 -受け入れ条件
 -制約事項

-**design.md**-変更内容の設計
 -実装アプローチ
 -変更するコンポーネント
 -データ構造の変更
 -影響範囲の分析

-**tasklist.md**-タスクリスト
 -具体的な実装タスク
 -タスクの進捗状況
 -完了状況

### ステアリングディレクトリの命令規則
'''
.steering/[YYYYMMDD]-[開発タイトル]/
'''

**例**
-'.steering/20250103-initial-implementation/'
-'.steering/20250115-add-tag-feature/'
-'.steering/20250120-fix-filter-bug/'
-'.steering/20250201-improve-performance/'

##開発プロセス

###初回セットアップ時の手順

####1.フォルダ作成
'''bash
mkdir -p docs
mkdir -p .steering
'''

####2.永続的ドキュメント作成('docs/')

アプリケーション全体の設計を定義します
各ドキュメントを作成後、必ず確認・承認を得てから次に進みます

1.'docs/product-requirements.md'-プロダクト要求定義書
2.'docs/functional-design.md'-機能設計書
3.'docs/architecure-.md'-技術仕様書
4.'docs/repository-structure.md'-リポジトリ構造定義書
5.'docs/development-guidelines.md'-開発ガイドライン
6.'docs/glossary-.md'-ユピキタス言語定義

**重要*:**1ファイルごとに作成後、必ず確認・承認を得てから次のファイル作成を行う

####3.初回実装用のステアリングファイル作成

初回実装用のディレクトリを作成し、実装に必要なドキュメントを配置します

'''bash
mkdir -p .steering/[YYYYMMDD]-initial-implementation
'''

作成するドキュメント
1.'.steering/[YYYYMMDD]-initial-implementation/requirements.md'-初回実装の要求
2.'.steering/[YYYYMMDD]-initial-implementation/design.md'-実装設計
3.'.steering/[YYYYMMDD]-initial-implementation/tasklist.md'-実装タスク

####4.環境セットアップ

####5.実装開始
'.steering/[YYYYMMDD]-initial-implementation/tasklist.md'に基づいて実装を進めます

####6.品質チェック

###機能追加・修正時の手順

####1.影響分析

-永続的にドキュメント('docs/')への影響を確認
-変更が基本設計に影響する場合は'docs/'を更新

####2.ステアリングディレクトリ作成

新しい作業用のディレクトリを作成します
'''bash
mkdir -p steering/[YYYYMMDD]-[開発タイトル]
'''

**例**
'''bash
mkdir -p steerinig/20250115-add-tag-feature
'''

####3.作業ディレクトリ作成

作業単位のドキュメンを作成します
各ドキュメント作成後、必ず確認・承認を得てから次に進みます
1.'.steering/[YYYYMMDD]-[開発タイトル]/requirements.md'-要求内容
2.'.steering/[YYYYMMDD]-[開発タイトル]/design.md'-設計
3.'.steering/[YYYYMMDD]-[開発タイトル]/tasklist.md'-タスクリスト

**重要:** 1ファイルごとに作成後、必ず確認・承認を得てから次のファイル作業を行う

####4.永続的ドキュメント更新(必要な場合のみ)

変更が基本設計に影響する場合、該当する'docs/'内のドキュメントを更新します

####5.実装開始

'.steering/[YYYYMMDD]-[開発タイトル]/tasklist.md'-に基づいて実装を進めます

####6.品質チェック

##ドキュメント管理の原則

###永続的ドキュメント('docs/')
-アプリケーションの基本設計を記述
-頻繁に更新されない
-大きな設計変更時のみ更新
-プロジェクト全体の「北極星」として機能

###作業単位のドキュメント('.steering/')
-特定の作業・変更に特化
-作業ごとに新しいディレクトリを作成
-作業完了後は履歴として保存
-変更の意図と経緯を記録

##図表・ダイアグラムの記載ルール

###記載場所
設計図やダイアグラムは、関連する永続的ドキュメント内に直接記載します
独立したdiagramsフォルダは作成せず、手間を最小限に抑えます

**配置例:**
-ER図、データモデル図→'functional-design.md'内に記載
-ユースケース図→'functional-design.md'または'product-requirements.md'内に記載
-画面遷移図、ワイヤフレーム→'functional-design.md'内に記載
ーシステム構成図→'functional-design.md'または'product-requirements.md'内に記載

###記述形式
1.**Mermaid記法(推奨)**
  -Merkdownに直接書き込める
  -バージョン管理が容易
  -ツール不要で編集可能

'''mermaid
graph TD
    A[ユーザー]-->B[タスク作成]
    B-->C[タスク一覧]
    C-->D[タスク編集]
    C-->E[タスク削除]

2.**ASCIIアート**
-シンプルな図表を使用
-テキストエディタで編集可能

'''
-------------------------
|     Header            |
-------------------------

          |
          ↓
-------------------------
|     Task List         |
-------------------------
'''

3.**画像ファイル(必要な場合のみ)**
 -複雑なワイヤフレームやモックアップ
 -'docs/images/'やフォルダに配置
 -PNGまたはSVG形式を推奨

###図表の更新
-設計変更時は対応する図表も同時に更新
-図表とコードの乖離を防ぐ

##注意事項
-ドキュメントの作成・変更は段階的に行い、各段階で承認を得る
-'.steering/'のディレクトリ名は日付と開発タイトルで明確に識別できるようにする
-永続的ドキュメントと作業単位のドキュメントを混同しない
-コード変更時は必ずリント・型チェックを実施する
-共通のデザインシステム(Tailwind CSS)を使用して統一感を保つ
-セキュリティを考慮したコーディング(XSS対策、入力バリージョンなど)
-図表は必要最小限に留め、メンテナンスコストを抑える

#プロダクト要求仕様書
-プロダクトビジョンと目的
-ターゲットユーザーと課題・ニーズ
-主要な機能一覧
-成功の定義
-ユーザーストーリー
-機能要件
-非機能要件
-受け入れ条件と優先順位

#プロダクト要求定義書(Product Requirements Document)

##プロダクト概要

###名称
**Devtask**-開発者向けタスク管理CLIツール

###プロダクトコンセプト
-**CLIで完結するタスク管理**:ターミナルから離れずにすべての操作を完結
-**優先順位の自動推定機能**:タスクの期限、作成日時、ステータス変更履歴などから優先順位を自動推定
-**シンプルで高速な操作感**:最小限のキー入力で操作完了、即座のレスポンス

###プロダクトビジョン
開発者がターミナルから離れることなく、効率的にタスク管理できるCLIツールを提供する
コマンドラインでの操作に特化し、開発フローを中断させない軽量で高速なタスク管理を実施する
優先順位の自動推定により、開発者は本質的な作業に集中できる

###目的
-ターミナルから離れずにタスク管理を完結
-開発プロジェクトごとのタスク管理
-Git連携による開発フロートの統合
-シンプルで直感的なCLIインターフェース
-高速な操作レスポンス
-AIによる優先順位自動推定で意思決定の負担軽減

##ターゲットユーザー

###プライマリーペルソナ:田中太郎(29歳、フルスタックエンジニア)
-フリーランスで3-5プロジェクトを並行
-Vim/Emacs+ターミナル環境
-タスク管理に時間をかけない
-Markdown、Git、CLツールを好む

##開発指標(KPI)

###プライマリーKPI
-アクティブユーザー(DAU):100人(3ヶ月後)
-タスク完了率:70%以上
-1日あたりの平均コマンド実行回数:10回以上

##機能要件

###コア機能(MVP)

####タスク管理機能
-タスクの作成・編集・削除(CRUD)
-タスクのステータス管理(未着手/進行中/完了)
-期限設定
-優先度自動設定

####CLIインターフェース
'''bash
#基本操作
devtask add "タスク名"--due 2025-01-15--priority high
devtask list
devtask next #今やるべきタスクを表示
devtask done <task-id>
devtask show <task-id>