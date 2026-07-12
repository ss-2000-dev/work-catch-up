# フロントエンド基礎 & React基礎 詳細ガイド

対象読者:インフラ・バックエンド寄りの経験はあるが、ブラウザの挙動やReactの基礎から体系的に理解したい人向け。サンプルコードと合わせて「なぜそう動くのか」を解説します。

---

# Part 1. Webブラウザの基礎

Reactを学ぶ前に、ブラウザが何をしているかを理解しておくと、React特有の挙動(なぜ再レンダリングが起きるのか、なぜ非同期処理でハマるのか)の理解が圧倒的に早くなります。

## 1-1. ブラウザのレンダリングの仕組み

ブラウザは、サーバーから受け取ったHTML/CSS/JavaScriptを画面に描画するまでに、大まかに以下のステップを踏みます。

```
HTML解析 → DOM構築 → CSS解析 → CSSOM構築 → DOM+CSSOM合体(レンダーツリー)
   → レイアウト計算(要素の位置・サイズ決定) → ペイント(実際に描画)
```

### DOM(Document Object Model)とは

HTMLをブラウザが解釈して、JavaScriptから操作できる「木構造のオブジェクト」に変換したものです。

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="app">
      <h1>こんにちは</h1>
      <p>これはDOMの説明です</p>
    </div>
  </body>
</html>
```

このHTMLは、ブラウザ内部では以下のようなツリー構造として保持されます。

```
html
 └─ body
     └─ div#app
         ├─ h1 「こんにちは」
         └─ p 「これはDOMの説明です」
```

JavaScriptからはこのツリーを直接操作できます。

```javascript
// id="app" の要素を取得
const app = document.getElementById("app");

// h1タグの中身を書き換える(DOMを直接操作)
document.querySelector("h1").textContent = "こんばんは";

// 新しい要素を作って追加する
const newP = document.createElement("p");
newP.textContent = "追加された段落です";
app.appendChild(newP);
```

**なぜこれが重要か**: Reactは内部的に「仮想DOM」という仕組みでこのDOM操作を効率化しています。素のJavaScriptでDOM操作がどれだけ大変か(要素を探して、書き換えて、追加して…という手続き的な処理)を知っておくと、Reactが何を解決してくれているのかが実感として理解できます。

### リフロー(レイアウト再計算)とリペイント

DOMやCSSを変更すると、ブラウザは以下のいずれか、または両方を再実行します。

- **リフロー(Reflow)**: 要素のサイズや位置に影響する変更があったとき、レイアウトを再計算する。コストが高い
- **リペイント(Repaint)**: 見た目(色など)だけが変わったとき、再描画する。リフローよりは軽い

```javascript
// リフローが発生しやすい操作(サイズ・位置に影響)
element.style.width = "200px";
element.style.display = "none";

// リペイントのみで済む操作(見た目だけの変更)
element.style.color = "red";
element.style.backgroundColor = "blue";
```

パフォーマンスを気にする場面では、「この操作はレイアウトに影響するか?」を意識すると良いです。Reactが再レンダリングを最小限に抑えようとするのも、このコストを避けるためです。

---

## 1-2. HTTP通信の基礎

フロントエンドはAPIサーバーと頻繁に通信します。インフラの知識があれば馴染みがあると思いますが、フロントエンド視点で重要な点を整理します。

### リクエストとレスポンスの基本

```javascript
// fetch API を使った基本的なGETリクエスト
fetch("https://api.example.com/users/1")
  .then((response) => {
    if (!response.ok) {
      // ステータスコードが200番台以外の場合、ここでエラー処理
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    return response.json(); // レスポンスボディをJSONとしてパース
  })
  .then((data) => {
    console.log(data); // { id: 1, name: "山田太郎" } のようなオブジェクト
  })
  .catch((error) => {
    console.error("通信に失敗しました:", error);
  });
```

async/await を使うと、同じ処理をより読みやすく書けます。

```javascript
async function fetchUser(id) {
  try {
    const response = await fetch(`https://api.example.com/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("通信に失敗しました:", error);
    throw error; // 呼び出し元にもエラーを伝播させる
  }
}
```

### 覚えておきたいステータスコード

| コード | 意味 | フロントエンドでの扱い |
|---|---|---|
| 200 | 成功 | 正常にデータを受け取り画面に反映 |
| 201 | 作成成功 | POSTでリソース作成が成功した場合 |
| 400 | リクエスト不正 | 入力値のバリデーションエラーなど、ユーザーに修正を促す |
| 401 | 未認証 | ログイン画面へリダイレクトすることが多い |
| 403 | 権限なし | 権限不足のメッセージを表示 |
| 404 | 見つからない | 該当データなしの画面表示 |
| 500 | サーバーエラー | 「時間をおいて再試行してください」等の汎用エラー表示 |

### CORS(Cross-Origin Resource Sharing)

フロントエンド開発で最初につまずきやすいポイントです。

**同一オリジンポリシー**という仕組みにより、ブラウザは「今表示しているページと異なるオリジン(ドメイン・ポート・プロトコルのいずれかが違う)」への通信を、デフォルトでは制限します。

```
https://app.example.com    ← フロントエンドが動いているオリジン
https://api.example.com    ← APIサーバーのオリジン(ドメインが違う = 別オリジン)
```

この場合、ブラウザは「本当にこの通信を許可していいか」をAPIサーバー側に確認します。サーバー側が以下のようなレスポンスヘッダーを返すことで、許可されたオリジンからのアクセスだと判断されます。

```
Access-Control-Allow-Origin: https://app.example.com
```

**よくあるエラー**: コンソールに `has been blocked by CORS policy` と出た場合、それはフロントエンド側のバグではなく、**APIサーバー側でCORSの許可設定がされていない**ことがほとんどです。インフラ側の知識がある分、この原因特定はむしろ得意分野になるはずです。

---

## 1-3. ブラウザストレージの使い分け

| 種類 | 保存期間 | 保存先 | 主な用途 |
|---|---|---|---|
| Cookie | 設定した有効期限まで(サーバーにも送信される) | ブラウザ | 認証トークン、セッションID |
| localStorage | 明示的に削除するまで永続 | ブラウザのみ | ユーザー設定、非機密なキャッシュ |
| sessionStorage | タブを閉じるまで | ブラウザのみ | 一時的な入力状態の保持など |

```javascript
// localStorage: ページを閉じても消えない
localStorage.setItem("theme", "dark");
const theme = localStorage.getItem("theme"); // "dark"
localStorage.removeItem("theme");

// sessionStorage: タブを閉じると消える
sessionStorage.setItem("formDraft", JSON.stringify({ name: "下書き中" }));

// Cookie: JavaScriptからも操作できるが、サーバーとの通信にも自動的に乗る
document.cookie = "sessionId=abc123; path=/; max-age=3600";
```

**重要な注意点**: localStorageやsessionStorageは**暗号化されておらず、XSS攻撃で盗まれる可能性がある**ため、認証トークンなど機密性の高い情報の保存には向きません。認証情報は基本的にHttpOnly属性をつけたCookie(JavaScriptから読み取れないCookie)で扱うのが一般的です。

---

## 1-4. 非同期処理とイベントループ

JavaScriptは基本的に**シングルスレッド**(1つの処理を順番にしか実行できない)ですが、通信待ちなどの時間がかかる処理をブロックせずに進められるのは「イベントループ」という仕組みのおかげです。

### 同期処理と非同期処理の違い

```javascript
console.log("1. 開始");

setTimeout(() => {
  console.log("2. 3秒後に実行される(非同期)");
}, 3000);

console.log("3. setTimeoutの後に書いてあるが、先に実行される");

// 実行結果:
// 1. 開始
// 3. setTimeoutの後に書いてあるが、先に実行される
// (3秒待つ)
// 2. 3秒後に実行される(非同期)
```

`setTimeout` は「3秒後に実行して」とブラウザに予約するだけで、その場で処理をブロックしません。そのため、コードの記述順と実行順が一致しない場合があります。これがイベントループの基本動作です。

### Promiseの基本

Promiseは「将来完了する処理」を表すオブジェクトです。

```javascript
function waitAndGetData() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = true;
      if (success) {
        resolve({ message: "データ取得成功" }); // 成功時
      } else {
        reject(new Error("データ取得失敗")); // 失敗時
      }
    }, 1000);
  });
}

waitAndGetData()
  .then((result) => console.log(result.message))
  .catch((error) => console.error(error.message));
```

### async/await(Promiseをより読みやすく書く構文)

```javascript
async function main() {
  console.log("処理開始");
  const result = await waitAndGetData(); // Promiseが解決されるまで待つ
  console.log(result.message);
  console.log("処理終了");
}

main();
// 実行結果:
// 処理開始
// (1秒待つ)
// データ取得成功
// 処理終了
```

`await` は「Promiseが解決されるまでこの行で待つ」という意味です。ただし、待っている間も**他のJavaScript処理(画面のクリックイベントなど)はブロックされません**。これがブラウザがフリーズしない理由です。

**Reactでこれが重要な理由**: APIからデータを取得して画面に表示する処理は、ほぼ必ずこの非同期処理を伴います。「データがまだ届いていない状態」と「データが届いた後の状態」をどう画面に反映するかが、Reactの state 管理の主な使いどころの一つです。

---

ここまでがブラウザ・JavaScriptの基礎です。次のPart 2では、これらの知識を踏まえてReactの基礎を解説します。

# Part 2. Reactの基礎

## 2-1. Reactとは何をしているものか

素のJavaScriptでDOMを直接操作すると、「どの要素を」「いつ」「どう書き換えるか」を全て手続き的に管理する必要があり、画面が複雑になるほど管理コストが跳ね上がります。

Reactは「今の状態(state)がこうなら、画面はこう見えるべき」という**宣言的な書き方**でUIを定義し、状態が変わったときの画面の更新をReact側に任せる仕組みです。

```javascript
// 素のJavaScript(命令的): 「何をどう変えるか」を逐一書く
let count = 0;
const button = document.getElementById("btn");
const display = document.getElementById("display");
button.addEventListener("click", () => {
  count = count + 1;
  display.textContent = count; // 手動でDOMを書き換える
});
```

```jsx
// React(宣言的): 「状態がこうなら画面はこう」を書くだけ
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

`setCount` が呼ばれると、Reactが「stateが変わった」ことを検知し、画面のどこを書き換える必要があるかを自動で判断して更新します。DOMを直接触るコードは自分では書きません。

---

## 2-2. コンポーネントとJSX

### コンポーネントとは

UIをパーツごとに分割した「部品」です。関数として定義し、必要な場所で呼び出して使います。

```jsx
// Greeting.jsx
function Greeting({ name }) {
  return <h1>こんにちは、{name}さん</h1>;
}

// 使う側
function App() {
  return (
    <div>
      <Greeting name="田中" />
      <Greeting name="鈴木" />
    </div>
  );
}
```

`{ name }` は**props(プロパティ)**と呼ばれ、親コンポーネントから子コンポーネントへデータを渡す仕組みです。関数の引数のようなものだと考えると理解しやすいです。

### JSXとは

`<h1>こんにちは</h1>` のように、JavaScriptの中にHTMLのような記法を書けるものがJSXです。実際にはJavaScriptに変換(トランスパイル)されて動きます。

```jsx
// これは
const element = <h1>こんにちは</h1>;

// 実際にはこう変換されて実行される(React.createElement呼び出し)
const element = React.createElement("h1", null, "こんにちは");
```

JSXの中でJavaScriptの変数や式を使う場合は `{}` で囲みます。

```jsx
function UserCard({ user }) {
  const isAdult = user.age >= 20;

  return (
    <div>
      <p>名前: {user.name}</p>
      <p>年齢: {user.age}</p>
      {/* 条件分岐: 三項演算子で出し分ける */}
      <p>{isAdult ? "成人です" : "未成年です"}</p>
      {/* リストの表示: mapを使う。keyは必須 */}
      <ul>
        {user.hobbies.map((hobby, index) => (
          <li key={index}>{hobby}</li>
        ))}
      </ul>
    </div>
  );
}
```

**`key` について**: リストをレンダリングする際、Reactは各要素を識別するために `key` を必要とします。indexをkeyに使うのは要素の並び替えや削除がない場合のみ推奨されます。データにID等の一意な値がある場合は、それをkeyに使う方が安全です。

```jsx
{users.map((user) => (
  <li key={user.id}>{user.name}</li> // idのような一意な値を使うのが望ましい
))}
```

---

## 2-3. state(状態)の基本 - useState

`useState` は、コンポーネントが「覚えておくべき値」を持つための仕組みです。この値が変わると、Reactは自動的に画面を再描画します。

```jsx
import { useState } from "react";

function Counter() {
  // useState(初期値) は [現在の値, 値を更新する関数] の配列を返す
  const [count, setCount] = useState(0);

  const handleIncrement = () => {
    setCount(count + 1); // これを呼ぶと再レンダリングがトリガーされる
  };

  return (
    <div>
      <p>現在のカウント: {count}</p>
      <button onClick={handleIncrement}>増やす</button>
    </div>
  );
}
```

### なぜ `count = count + 1` のように直接書き換えてはいけないのか

```jsx
// NG: これでは画面が更新されない
const handleIncrement = () => {
  count = count + 1; // 直接代入してもReactは変化を検知できない
};
```

Reactは `useState` が返す「更新関数(この例では `setCount`)」が呼ばれたときにだけ、値が変わったと認識して再レンダリングを行います。変数を直接書き換えても、Reactには伝わりません。この「更新は必ず専用の関数経由で行う」というルールがReactの中心的な考え方です。

### 状態更新が非同期的にまとまる点に注意

```jsx
const handleClick = () => {
  setCount(count + 1);
  setCount(count + 1);
  // 直感的には+2されそうだが、同じレンダリング内では count は古い値のまま参照されるため
  // 結果は+1にしかならない
};

// 正しく連続更新したい場合は関数形式を使う
const handleClickCorrect = () => {
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
  // これなら+2される。常に「直前の最新値」を受け取れるため
};
```

---

## 2-4. useEffect - 副作用(データ取得など)の扱い

`useEffect` は「レンダリングの後に実行したい処理」を書くためのフックです。API通信、タイマー設定、イベントリスナーの登録などに使います。

```jsx
import { useState, useEffect } from "react";

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    async function fetchUser() {
      try {
        const response = await fetch(`https://api.example.com/users/${userId}`);
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("取得エラー:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]); // 依存配列: userIdが変わるたびに再実行される

  if (loading) return <p>読み込み中...</p>;
  if (!user) return <p>ユーザーが見つかりません</p>;

  return <p>{user.name}さんのプロフィール</p>;
}
```

### 依存配列(第2引数)の意味

```jsx
useEffect(() => {
  console.log("毎回のレンダリング後に実行される");
}); // 依存配列なし

useEffect(() => {
  console.log("最初の1回だけ実行される");
}, []); // 空配列

useEffect(() => {
  console.log("userIdが変わるたびに実行される");
}, [userId]); // 特定の値を指定
```

Part 1で説明した「非同期処理」がここで直結します。APIからのデータ取得は時間がかかるため、`loading` という状態を用意し、「取得中」「取得完了」で表示を出し分けるのがReactでの典型パターンです。

### クリーンアップ処理

イベントリスナーやタイマーは、コンポーネントが画面から消えるときに後片付け(クリーンアップ)しないと、メモリリークや意図しない動作の原因になります。

```jsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log("1秒ごとに実行");
  }, 1000);

  // returnで返した関数がクリーンアップ処理として扱われる
  return () => {
    clearInterval(timer); // コンポーネントが消えるときにタイマーを止める
  };
}, []);
```

---

## 2-5. イベントハンドリング

```jsx
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault(); // フォームのデフォルト送信(ページリロード)を防ぐ
    console.log("送信内容:", { email, password });
    // ここでAPIにログインリクエストを送る処理などを書く
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="メールアドレス"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="パスワード"
      />
      <button type="submit">ログイン</button>
    </form>
  );
}
```

このように、入力値(`value`)をstateで管理し、変更イベント(`onChange`)でstateを更新するパターンを**制御されたコンポーネント(Controlled Component)**と呼びます。入力欄の「今の値」を常にReact側のstateが持っている状態です。

---

## 2-6. propsとstateの違い(混同しやすいポイント)

| | props | state |
|---|---|---|
| 誰が設定するか | 親コンポーネントが渡す | コンポーネント自身が管理する |
| 変更できるか | 子コンポーネント側からは変更不可(読み取り専用) | `useState` の更新関数で変更可能 |
| 役割 | 親から子への「データの受け渡し」 | コンポーネント自身の「内部状態の記憶」 |

```jsx
function Parent() {
  const [count, setCount] = useState(0); // stateは自分自身が持つ

  return <Child value={count} onIncrement={() => setCount(count + 1)} />;
  // Childにはpropsとして渡している
}

function Child({ value, onIncrement }) {
  // このコンポーネント内で value を直接書き換えることはできない
  return (
    <div>
      <p>{value}</p>
      <button onClick={onIncrement}>増やす</button>
    </div>
  );
}
```

---

## 2-7. 状態管理の考え方(ローカル vs グローバル)

小規模なアプリでは各コンポーネントの `useState` だけで十分ですが、複数の離れたコンポーネントで同じデータを共有したい場合は工夫が必要です。

### Context API(Reactに標準搭載されている仕組み)

```jsx
import { createContext, useContext, useState } from "react";

// 1. Contextを作る
const ThemeContext = createContext();

// 2. 上位コンポーネントでProviderとして値を提供する
function App() {
  const [theme, setTheme] = useState("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Header />
      <MainContent />
    </ThemeContext.Provider>
  );
}

// 3. 下位のどのコンポーネントからでも直接値を取得できる(propsのバケツリレー不要)
function Header() {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      現在のテーマ: {theme}
    </button>
  );
}
```

Contextを使わない場合、`theme` を必要とする深い階層のコンポーネントまで、途中の全コンポーネントにpropsを渡し続ける必要があります(これを「propsのバケツリレー」と呼びます)。Contextはこれを避けるための仕組みです。

**使い分けの目安**:
- 特定の1コンポーネントとその直接の子だけで完結する状態 → `useState` で十分
- アプリ全体やかなり広い範囲で共有したい状態(ログインユーザー情報、テーマ設定など) → Context、または規模が大きい場合はRedux/Zustandなどのライブラリを検討

---

## 2-8. React Router(ルーティングの基礎)

SPA(Single Page Application)では、URLが変わってもページ全体を再読み込みせず、表示するコンポーネントだけを切り替えます。

```jsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">ホーム</Link>
        <Link to="/users">ユーザー一覧</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users" element={<UserList />} />
        <Route path="/users/:userId" element={<UserDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

// URLパラメータの取得
import { useParams } from "react-router-dom";

function UserDetail() {
  const { userId } = useParams(); // /users/123 なら userId は "123"
  return <p>ユーザーID: {userId} の詳細ページ</p>;
}
```

`<Link>` タグを使うことで、通常の `<a>` タグと違いページの再読み込みなしに画面遷移ができます。これがSPAらしい挙動の中心部分です。

---

## Part 3. 学習の進め方の提案

一気に全部理解しようとせず、以下の順番で手を動かしながら進めるとつまずきにくいです。

1. **JSXとpropsだけ**でコンポーネントを組み合わせる練習(state無しの静的な画面)
2. `useState` でボタンクリックなどのシンプルな状態管理を作る(カウンターアプリなど)
3. `useEffect` + `fetch` で外部APIからデータを取得して表示する(ローディング状態も含めて)
4. フォーム入力(制御されたコンポーネント)を作る
5. React Routerで複数ページの遷移を作る
6. 必要になったタイミングでContextや状態管理ライブラリを学ぶ(最初から全部を覚えようとしない)

インフラ側の知識がある分、「なぜこの通信が失敗するのか」「なぜこのデータが表示されないのか」といったデバッグは、ブラウザの開発者ツール(Networkタブ、Consoleタブ)を使えばインフラのログ調査の感覚に近い形で進められるはずです。