# work-catch-up について

このディレクトリは、ユーザー(SCM/PO兼フロントエンド開発者)がソフトウェア開発プロセス全般とReact/TypeScriptフロントエンド開発をキャッチアップするための個人用ドキュメント・サンプルコード置き場。

## ディレクトリ構成

### キャッチアップ用ドキュメント(ルート直下)

- `project-management.md` — プロジェクトマネジメント基礎(受け入れ条件のGiven/When/Then等)
- `definition-of-done.md` — 完了の定義(DoD)ガイド。**縦切り(機能単位)/横切り(工程単位)の考え方の元ネタ**
- `front-end.md` — フロントエンド基礎(ブラウザの仕組み、HTTP通信など)の解説
- `試験-テストの基礎知識.md` — ソフトウェアテストの基礎知識
- `システム開発フェーズ-具体例-TaskFlow.md` — TaskFlowを題材にしたシステム開発フェーズの解説
- `トレーサビリティマトリクス-具体例-ポイント交換.md` — トレーサビリティマトリクスの具体例
- `要求仕様書ガイド + TaskFlow 要求仕様書.md` — 要求仕様書の書き方ガイド

### SCM/PO向け: チケットの切り方・粒度に関するドキュメント

`front-end/`のサンプルプロジェクトを題材にして作成した、チケット起票の実践ガイド群。

- `フロントエンドタスクの例.md` — チケットの切り方(工程分割 vs 機能単位)を、実際の新機能追加(コメント機能・CSV集計機能)を題材に比較。チケット名・完了条件・コードレベルの作業手順まで具体化
- `フロントエンドのタスクの粒度.md` — タスクの粒度をLv.1(関数)〜Lv.5(エピック)で整理。さらに画面レベル(Lv.3)チケットの「完了条件の書き方5段階」「担当エンジニアのレベル5段階」を追記
- `フロントエンド開発でやること_考慮すること.md` — フロントエンド開発で考慮すべき範囲をLevel 1(見た目の再現)〜Level 10(組織の技術戦略)の成熟度モデルとして整理。Level 4(画面遷移)とLevel 7(非機能要件)は必要な知識+コード例つきで詳しく解説

これら3つのドキュメントは相互に参照し合っている。新しいタスク粒度・チケット文面の話が出たら、まずこの3つを確認する。

### ga/ ディレクトリ(GA4のドキュメント)

`front-end/`がMPA構成になっている理由そのものであるGA4について、基礎知識と実装方法をまとめたもの。

- `ga/GA4の基礎知識.md` — GA4とは何か、計測できること/できないこと、POと会話するための用語集
- `ga/GA4の実装ガイド.md` — 実際に書くコード(計測タグの設置、カスタムイベント)、開発時の注意点、チェックリスト。コード例は`front-end/`のサンプルにそのまま組み込める形

**注意**: `front-end/`のサンプルコード自体にGA4の計測コードは入れていない(実装ガイド上の例として示すに留めている)。GA関連の質問が出たらまず`ga/`配下を参照する。

---

## front-end/ ディレクトリ(Reactキャッチアップ用サンプルプロジェクト)

React + TypeScriptのキャッチアップ用に作った、チケット管理アプリ(+CSV集計機能)のサンプル。認証・ログインは対象外。**ユーザーの実際の業務システムの構成に合わせた設計方針**を採用しているため、一般的なReactチュートリアルとは異なる点に注意。

### 採用している方針とその理由

1. **SPAルーターを使わない(MPA構成)**
   ユーザーの実務システムがGA4を導入する都合上、SPA(react-router等でリロードなしに遷移する構成)ではなく、**画面(URL)ごとに実際にページが切り替わる**構成にしている。GA4の標準的な`page_view`計測が、SPA遷移では自動発火しないため。
   - ページごとに独立したHTML + 独立したReactアプリ(`App.tsx`/`main.tsx`)を用意する(`src/pages/list/`, `src/pages/new/`, `src/pages/detail/`, `src/pages/edit/`, `src/pages/upload/`)。これはユーザーの実務コードの構成(ページごとにApp.tsx/main.tsxがある)に合わせたもの
   - ページ間の遷移は`<a href="...">`または`window.location.href`によるブラウザの通常のページ遷移(フルリロード)
   - 動的な`/tickets/:id`のようなクリーンURLは、`vite.config.ts`の`cleanUrlRewrite`プラグイン(開発サーバーのミドルウェア)でリライトして実現している。**本番配信時はホスティング側(nginx/CDN等)で同様のリライトが必要**、という前提を崩さないこと
   - 実装の背景・ページ構成の対応表は`front-end/README.md`を参照

2. **`useReducer`は使わない方針**
   ユーザーの実務コードの複雑さが「せいぜい`useReducer`程度」であり、かつ本人はuseReducer自体のキャッチアップを希望していないため、**状態管理は`useState`のみ**で統一している。フォームなど複数フィールドを持つ場合も、項目ごとに`useState`を並べる書き方にしている(`src/components/TicketForm.tsx`が実例)。今後この方針で追加実装する場合も`useReducer`は使わない

3. **完了の定義(DoD)は`../definition-of-done.md`を参照**
   `front-end/`配下のサンプル自体にはDoDを定義していない。チケットの完了条件を考える際は、リポジトリルートの`definition-of-done.md`(特に「縦切り/横切り」の章)を参照する運用

### ディレクトリ構成の要点

```
front-end/
  index.html, tickets/*.html, upload.html   ページごとのHTMLエントリ
  vite.config.ts                             マルチページのビルド設定 + クリーンURLのリライト
  db.json                                    json-server用の疑似バックエンドデータ
  src/
    pages/{list,new,detail,edit,upload}/     ページごとのApp.tsx + main.tsx
    components/                              TicketForm, Modal, TicketStatusBadge(共通部品)
    api/                                     client.ts(fetch共通処理), ticketApi.ts
    types/ticket.ts
    utils/{path.ts, parseZipCsv.ts}          URLからのID取得、zip+CSV集計ロジック
```

動かし方は`front-end/README.md`に記載(`npm run mock-api`と`npm run dev`を別ターミナルで起動)。

### この方針で新規開発する際の注意

- 新しい画面を追加する場合も、**ページごとに`App.tsx`/`main.tsx`を作り、`vite.config.ts`にHTMLエントリとURLリライトを追加する**という既存パターンを踏襲する
- SPAルーター(react-router等)を提案・導入しない。GA4対応の都合で意図的に外している方針であることを踏まえる
- 複雑な状態管理(useReducer、Redux、Zustand等)を安易に提案しない。素朴な`useState`で足りる設計を優先する
