# フロントエンドキャッチアップ用サンプル(チケット管理アプリ)

React + TypeScriptで、以下3点にしぼったサンプルです。認証・ログインは含みません。

- 画面遷移(ページごとに独立したHTML/フルリロード。SPAルーターは不使用)
- 値の保持(useState)
- バックエンドへのリクエスト(fetch)

## なぜSPAルーターを使わないのか

業務システムがGA4を導入する都合上、SPA(react-router等でページ遷移してもリロードしない構成)ではなく、
**画面(URL)ごとに実際にページが切り替わる**構成にしています。ページ遷移のたびにブラウザが実際にHTMLを読み込むので、
GA4の標準的なpage_view計測がそのまま機能します(このサンプルにGA4のコード自体は入れていません)。

具体的には、Reactの1つのSPAとして作るのではなく、**ページごとに別々のHTML + 別々のReactアプリ(App.tsx/main.tsx)**を用意し、
ページ間の移動は`<a href="...">`によるブラウザの通常のページ遷移(フルリロード)にしています。

## 動かし方

```bash
npm install
npm run mock-api   # ターミナル1: 疑似バックエンド(json-server)を起動 http://localhost:4000
npm run dev        # ターミナル2: フロント(vite)を起動
```

## ページ構成

| URL | 実体のHTML | ページのReactアプリ |
|---|---|---|
| `/` | `index.html` | `src/pages/list/` (一覧) |
| `/tickets/new` | `tickets/new.html` | `src/pages/new/` (新規作成) |
| `/tickets/:id` | `tickets/detail.html` | `src/pages/detail/` (詳細) |
| `/tickets/:id/edit` | `tickets/edit.html` | `src/pages/edit/` (編集) |
| `/upload` | `upload.html` | `src/pages/upload/` (CSV集計) |

`/tickets/1`のような動的な部分を含むキレイなURLにするため、開発サーバー(`vite.config.ts`の`cleanUrlRewrite`プラグイン)で
リクエストURLを対応する静的HTMLにリライトしています。ページ内では、SPAルーターの`useParams`の代わりに
`src/utils/path.ts`の`getTicketIdFromPath()`で`window.location.pathname`からIDを読み取っています。

**本番配信時の注意**: 開発サーバーのリライトはあくまでローカル確認用です。実際の本番環境では、
ホスティング(nginxやCDNのリライトルール、あるいはサーバーサイドのルーティング)側で同様のURL書き換えが必要になります。

## ファイルと観点の対応

| 観点 | 該当ファイル | 見るポイント |
|---|---|---|
| 画面遷移 | `src/pages/*/App.tsx`内の`<a href>` | 通常のブラウザ遷移(フルリロード)でページを移動 |
| 画面遷移 | `src/pages/detail/App.tsx`・`src/pages/new/App.tsx` | 削除後・保存後は`window.location.href`で遷移 |
| 画面遷移 | `vite.config.ts` | ページごとのHTML定義(`build.rollupOptions.input`)とURLリライト |
| 値の保持 | `src/components/TicketForm.tsx` | 入力項目ごとに`useState` |
| 値の保持 | `src/pages/list/App.tsx` | 一覧データ・ローディング・エラーの状態管理 |
| API通信 | `src/api/client.ts` | fetchの共通処理(エラーハンドリング含む) |
| API通信 | `src/api/ticketApi.ts` | GET/POST/PUT/DELETEの呼び出し関数 |
| API通信 | 各ページの`useEffect` | ページ読み込み時にデータ取得 |
| モーダル | `src/components/Modal.tsx`・`src/pages/upload/App.tsx` | `useState`で開閉を管理する簡易モーダル |

## CSV集計画面(`/upload`)について

zip化されたCSVをアップロードすると、ブラウザ内で解凍・パース・集計まで行い、結果をモーダルで表示するサンプルです(サーバーには送信しません)。

- 解凍: `jszip`でzip内の最初の`.csv`ファイルを取り出す
- パース: `papaparse`でCSVをパースし、1行目はヘッダーとしてスキップ
- 集計: C列(`src/utils/parseZipCsv.ts`の`POINT_COLUMN_INDEX`)を仮想ポイントとみなして合計、行数をユーザー数として集計
- 表示: `src/components/Modal.tsx`(汎用モーダル)に結果を表示

## ディレクトリ構成

```
index.html              一覧ページのHTML
tickets/new.html         新規作成ページのHTML
tickets/detail.html      詳細ページのHTML
tickets/edit.html        編集ページのHTML
upload.html              CSV集計ページのHTML
src/
  pages/
    list/   (App.tsx, main.tsx)   一覧ページ
    new/    (App.tsx, main.tsx)   新規作成ページ
    detail/ (App.tsx, main.tsx)   詳細ページ
    edit/   (App.tsx, main.tsx)   編集ページ
    upload/ (App.tsx, main.tsx)   CSV集計ページ
  components/
    TicketForm.tsx         新規作成・編集で共用するフォーム部品
    TicketStatusBadge.tsx
    Modal.tsx               汎用モーダル
  api/
    client.ts               fetch共通処理
    ticketApi.ts             チケットAPI呼び出し関数
  types/ticket.ts
  utils/
    path.ts                URLからticket idを取り出すヘルパー
    parseZipCsv.ts           zip解凍・CSVパース・集計ロジック
```

一覧 → 詳細 → 編集、一覧 → 新規作成、という一通りの画面遷移とAPI呼び出し(CRUD)を、
「ページごとに実際に遷移する」構成で体験できるようにしています。
