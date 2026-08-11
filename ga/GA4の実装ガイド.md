# GA4の実装ガイド

対象読者: 実際にGA4を組み込むフロントエンドエンジニア、およびその作業内容を把握したいSCM/PO向け。「開発時に何に気をつけるか」と「実際にどんなコードを書くか」をまとめます。

用語や前提知識は [GA4の基礎知識.md](GA4の基礎知識.md) を参照してください。コード例は`front-end/`のサンプルプロジェクト(React + TypeScript + Vite、MPA構成)にそのまま組み込める形で書いています。

---

## 1. 着手前に必ず確認すること

コードを書き始める前に、ここが決まっていないと必ず手戻りします。**チケットに書かれていなければ、POに確認してください。**

- [ ] **gtag.js直接か、GTM(Googleタグマネージャー)経由か**
  - GTM経由の場合、**フロントエンドのコードにGA4のコードはほとんど書きません**。代わりに`dataLayer`にデータを積む実装になり、実際のタグ設定はマーケ担当がGTMの管理画面で行います
  - どちらかで作業内容が根本的に変わるため、最初に必ず確認します
- [ ] **測定ID(`G-XXXXXXXXXX`)は本番/検証で分かれているか**
  - 分かれていないと、**開発中の操作が本番の数値を汚染します**
- [ ] **何を計測したいか(計測設計)が決まっているか**
  - 「とりあえずタグだけ入れて」はよくありますが、それだと`page_view`しか取れません
  - 業務固有の操作を測りたいなら、**イベント名とパラメータの一覧をPOと合意してから**実装します
- [ ] **個人情報がURLやパラメータに含まれていないか**
  - URLにメールアドレス等が含まれる設計だと、`page_view`で自動送信され規約違反になります

---

## 2. 基本の計測タグ(page_view)を入れる

### 2-1. 素のHTMLに入れる場合(基本形)

Googleが提供するスニペットを、各ページの`<head>`内に入れます。

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());

  // このconfigの呼び出し時点で、page_viewイベントが自動的に1回送信される
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**ポイント**: `gtag('config', ...)`を呼ぶと、**その場で`page_view`が1回送られます**。つまりページを読み込むたびに自動で1PVが記録されます。これがGA4の基本動作です。

### 2-2. このサンプルプロジェクト(MPA)への組み込み方

`front-end/`はページごとにHTMLが分かれている(`index.html`、`tickets/detail.html`、`upload.html`など計5ファイル)ため、**5ファイル全部にスニペットをコピペするのは保守性が悪い**です。Viteの`transformIndexHtml`を使い、全HTMLに自動注入します。

既に`cleanUrlRewrite`という自作プラグインがある[`vite.config.ts`](../front-end/vite.config.ts)に、もう1つプラグインを追加する形です。

```ts
// vite.config.ts
import { defineConfig, loadEnv, type Plugin } from "vite";

// 全てのHTMLエントリにGA4の計測タグを注入する
// 測定IDが未設定(ローカル開発時など)なら何も注入しない
function injectGaTag(measurementId: string | undefined): Plugin {
  return {
    name: "inject-ga-tag",
    transformIndexHtml() {
      if (!measurementId) return [];
      return [
        {
          tag: "script",
          attrs: {
            async: true,
            src: `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
          },
          injectTo: "head",
        },
        {
          tag: "script",
          children: [
            "window.dataLayer = window.dataLayer || [];",
            "function gtag(){ dataLayer.push(arguments); }",
            "gtag('js', new Date());",
            `gtag('config', '${measurementId}');`,
          ].join("\n"),
          injectTo: "head",
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  // .env.production などから測定IDを読み込む(コードに直接書かない)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      cleanUrlRewrite(),
      injectGaTag(env.VITE_GA_MEASUREMENT_ID),
    ],
    // build設定は既存のまま
  };
});
```

環境ごとの測定IDは`.env`ファイルで分離します(**`.env`はGitにコミットしない**)。

```bash
# .env.production
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# .env.development は測定IDを書かない(= ローカル開発では計測タグが入らない)
```

**これでMPA構成のpage_view計測は完了です。** 一覧→詳細→編集と遷移するたびにブラウザが実際にHTMLを読み込むため、その都度`gtag('config')`が実行され、`page_view`が自動送信されます。追加のコードは要りません。

### 2-3. 補足: SPAの場合はどうなるか(前提の訂正を含む)

このプロジェクトはMPAなので不要ですが、業務で別プロジェクトに触れる際のために正確に整理しておきます。

**「SPAではpage_viewが全く飛ばない」というのは正確ではありません。** GA4の拡張計測機能には**「ブラウザの履歴イベントに基づくページの変更」**という設定があり、これがONだと`history.pushState`(react-router等が使うAPI)を検知して`page_view`を自動送信します。既定でONです。

ただし、**実務でこれをそのまま信用しないほうがよい理由**があります。

- **ページタイトルがズレる**: 履歴変更の検知が、Reactが`document.title`を書き換えるより先に走ることがあり、**遷移前のタイトルが記録される**という有名な問題があります
- **計測タイミングを制御できない**: 「データの取得が完了してから計測したい」といった要件に対応できません
- **ルーターの実装によっては検知されない**ケースがある

そのため、SPAで確実に計測するなら**自動送信を切って手動で送る**のが定石です。

```tsx
// SPAの場合の実装例(このプロジェクトでは使わない、比較用)

// 1) まず自動のpage_view送信を止める
//    gtag('config', 'G-XXXXXXXXXX', { send_page_view: false });

// 2) ルート変更を検知して、自分のタイミングで送る
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function usePageView() {
  const location = useLocation();

  useEffect(() => {
    window.gtag?.("event", "page_view", {
      page_location: window.location.href,
      page_path: location.pathname + location.search,
      page_title: document.title, // タイトル更新後に呼ばれるよう順序に注意
    });
  }, [location]);
}
```

**MPA構成を選んでいる理由は、この面倒がそもそも発生しないためです。** ページが実際に読み込まれる以上、タイトルのズレも検知漏れも構造的に起こりません。

---

## 3. カスタムイベント(業務固有の操作)を計測する

`page_view`以外、つまり「チケットのステータスを変更した」「CSVを集計した」といった操作は、**自分でコードを書かないと絶対に取れません**。

### 3-1. 型定義を用意する

`window.gtag`はTypeScriptの標準の型に存在しないため、宣言を追加します。

```ts
// src/types/gtag.d.ts
export {};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
```

### 3-2. 呼び出し用のラッパーを1つ作る

**画面のコードから`window.gtag`を直接呼ぶのは避けます。** 必ずラッパーを1枚挟んでください。理由は後述します。

```ts
// src/utils/analytics.ts

// GA4に送れる値は文字列・数値・真偽値のみ(オブジェクトや配列は送れない)
type EventParams = Record<string, string | number | boolean>;

/**
 * GA4にカスタムイベントを送信する。
 * 計測タグが未読み込み・広告ブロッカーでブロックされている場合は何もしない。
 */
export function sendEvent(name: string, params?: EventParams): void {
  // gtagが存在しない環境(ローカル開発、ブロック時)でも画面が壊れないようにする
  if (typeof window.gtag !== "function") return;

  window.gtag("event", name, params);
}
```

**ラッパーを挟む理由(重要)**:

1. **計測が原因で画面が壊れるのを防ぐ**。広告ブロッカーで`gtag`が読み込まれないユーザーは一定数います。`window.gtag(...)`を直接呼ぶと`undefined is not a function`で画面が落ちます。**計測は業務機能より優先度が低く、失敗しても画面は動き続けるべき**です
2. **後からGTMに移行する等の変更が、この1ファイルの修正で済む**
3. **送信前にパラメータを検証したり、個人情報が混入していないかチェックする場所を1箇所にまとめられる**

### 3-3. 実際の画面での使用例

#### 例1: チケットのステータス変更([`src/pages/detail/App.tsx`](../front-end/src/pages/detail/App.tsx))

```tsx
import { sendEvent } from "../../utils/analytics";

async function handleStatusChange(status: TicketStatus) {
  if (!id || !ticket) return;

  const updated = await updateTicket(id, { ...ticket, status });
  setTicket(updated);

  // 成功した後に送る(失敗したのに「変更した」と記録されないようにする)
  sendEvent("ticket_status_change", {
    from_status: ticket.status,
    to_status: status,
  });
}
```

**ポイント**: **計測は必ず「処理が成功した後」に送ります。** ボタンのクリック直後に送ると、APIが失敗した場合でも「変更された」と記録され、数値が実態とズレます。

「押されたこと自体」を知りたい場合は、`ticket_status_change_attempt`と`ticket_status_change`を分けて送る、あるいは成否をパラメータに入れる設計にします。

#### 例2: CSV集計([`src/pages/upload/App.tsx`](../front-end/src/pages/upload/App.tsx))

```tsx
import { sendEvent } from "../../utils/analytics";

async function handleUpload() {
  if (!selectedFile) return;
  setIsProcessing(true);
  setError(null);

  try {
    const aggregated = await aggregatePointsFromZip(selectedFile);
    setResult(aggregated);

    sendEvent("csv_aggregate_complete", {
      row_count: aggregated.rowCount,
      // fileName は送らない: 業務ファイル名に顧客名や個人名が入る可能性がある
      // totalPoints も、業務上の機密性次第では送るべきか要確認
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : "集計に失敗しました");

    // 失敗も計測しておくと「どのくらいの人が使えていないか」が分かる
    sendEvent("csv_aggregate_error", {
      error_message: err instanceof Error ? err.message : "unknown",
    });
  } finally {
    setIsProcessing(false);
  }
}
```

**ポイント**: コメントで書いた通り、**ファイル名を送ってはいけません**。業務で扱うファイル名には顧客名・個人名が含まれることが多く、無意識に個人情報をGA4へ送ってしまう典型的な事故パターンです。「このパラメータに個人情報が混入する可能性はないか」を、実装時に必ず自問してください。

---

## 4. 開発時に気をつけること

### 4-1. 命名規則と制限値

GA4には無視できない制限があります。**超えた分は黙って切り捨てられる**(エラーにならない)ため、事故に気づきにくいです。

| 項目 | 制限 |
|---|---|
| イベント名 | **40文字**以内、英数字とアンダースコアのみ、**大文字小文字を区別する** |
| パラメータ名 | **40文字**以内 |
| パラメータ値 | **100文字**以内(超えた分は切り捨て) |
| 1イベントあたりのパラメータ数 | **25個**まで |
| カスタムディメンション登録数 | イベントスコープで**50個**まで |

**命名のルール**:
- **`snake_case`(小文字とアンダースコア)で統一する**。GA4の公式イベント名がすべてこの形式のため、揃えないとレポートで見分けにくくなります
- `google_`、`ga_`、`firebase_`で始まる名前は**予約済みで使用不可**
- **チーム内で命名規則を決めて文書化する**。`ticketStatusChange`と`ticket_status_change`が混在すると、GA4上は完全な別イベントとして扱われ、集計が分断されます

### 4-2. 「実装したのにレポートに出ない」の典型原因

実装後、POから「データが見えない」と言われる原因のほとんどはこれです。

1. **カスタムディメンションの登録忘れ**
   - 独自のパラメータ(例: `from_status`)を送っても、**GA4管理画面で「カスタムディメンション」として登録しない限り、レポートの切り口として使えません**
   - さらに**登録した時点より後のデータにしか適用されません**(遡及しない)。実装と同時に登録を依頼するのが鉄則です
2. **レポートへの反映待ち**
   - 標準レポートへの反映には数時間〜24時間かかります。実装直後は**DebugViewかリアルタイムレポート**で確認します
3. **広告ブロッカー**
   - 自分の環境で確認していたら、自分のブラウザの拡張機能でブロックされていた、というのはよくあります

### 4-3. 動作確認の方法

```ts
// 開発時のみ、GA4の「DebugView」に自分の操作を表示させる
gtag('config', 'G-XXXXXXXXXX', { debug_mode: true });
```

`debug_mode: true`を付けると、GA4管理画面の**DebugView**に自分の操作がリアルタイムで表示され、イベント名とパラメータが意図通りか確認できます。

ブラウザの開発者ツールで確認する方法もあります。

- **Networkタブ**で`collect`を検索 → GA4への送信リクエストが見える。クエリパラメータの`en=`がイベント名
- **Chrome拡張の「Google Tag Assistant」**でも確認可能

**確認すべき観点**:
- [ ] イベントが**意図した回数**送られているか(React StrictModeの二重実行や、useEffectの依存配列ミスで2回送られる事故が多い)
- [ ] パラメータの値が正しいか(`undefined`が入っていないか)
- [ ] 個人情報が含まれていないか
- [ ] 開発環境の操作が本番プロパティに飛んでいないか

### 4-4. React特有の落とし穴: イベントの二重送信

`useEffect`内でイベントを送る場合、**React 18のStrictMode(開発時)では意図的に2回実行されます**。また依存配列の指定を誤ると、再レンダリングのたびに送信されてしまいます。

```tsx
// NG: ticketが更新されるたびに送られてしまう
useEffect(() => {
  sendEvent("ticket_detail_view", { ticket_id: id });
}, [ticket]);

// OK: idが変わったときだけ送る
useEffect(() => {
  if (!id) return;
  sendEvent("ticket_detail_view", { ticket_id: id });
}, [id]);
```

そもそも**ユーザーの操作に紐づくイベントは`useEffect`ではなくイベントハンドラ内で送る**ほうが安全です。

### 4-5. 同意管理(Cookie同意)

EU・英国のユーザーが対象に含まれる場合、**同意なしでの計測は法令(GDPR等)違反**になります。Googleは「同意モード(Consent Mode)」という仕組みを用意しており、同意バナーの実装とセットで対応が必要です。

日本国内向けサービスのみであれば必須ではありませんが、**改正個人情報保護法・電気通信事業法の外部送信規律により、プライバシーポリシーへの記載が必要**です。この判断は法務・POマターなので、**エンジニア個人で判断せず必ず確認**してください。

---

## 5. 実装チェックリスト

チケットの完了条件に組み込める形にしたものです。

**着手前**
- [ ] gtag.js直接かGTM経由か確認した
- [ ] 本番/検証で測定IDが分かれている
- [ ] 計測したいイベント名・パラメータをPOと合意した

**実装**
- [ ] 測定IDを環境変数から読み込んでいる(コードに直接書いていない)
- [ ] `gtag`を直接呼ばず、ラッパー関数を経由している
- [ ] 計測タグが読み込まれていなくても画面が壊れない
- [ ] イベント名・パラメータ名が`snake_case`で、命名規則に沿っている
- [ ] パラメータに個人情報・機密情報が含まれていない
- [ ] 計測が「処理成功後」に送られている

**確認**
- [ ] DebugViewで意図通りのイベント・パラメータが飛んでいる
- [ ] イベントが二重送信されていない
- [ ] 開発環境の操作が本番プロパティに飛んでいない
- [ ] カスタムディメンションの登録をPO/マーケ担当に依頼した

---

## 6. SCM/POとして押さえておくポイント

- **「GAを入れる」は`page_view`だけなら軽い作業だが、業務固有の操作の計測は1つずつ実装が必要**。チケットの見積もりでは「何個のイベントを実装するか」で工数が変わります
- **計測設計(何を測るか)は、実装より前に決める必要がある**。後から「あれも測りたかった」は遡って取れません
- **計測要件は完了条件に書かれにくい**([フロントエンド開発でやること_考慮すること.md](../フロントエンド開発でやること_考慮すること.md)のLevel 9で触れている領域)。新規画面のチケットには、計測要件を明示的に含めるとよいです
- **カスタムディメンションの登録はGA4管理画面側の作業**であり、エンジニアの実装だけでは完結しません。誰がいつやるかをチケットに含めてください
