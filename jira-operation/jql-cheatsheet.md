# JQLチートシート(1プロジェクト運用向け)

対象読者:JQLをまだ書けない/毎回検索条件をUIでポチポチ組んでいる人。1つのプロジェクト内での運用を前提に、コピペしてプロジェクトキーだけ書き換えれば使えるクエリを集めた。

以下の例では`PROJ`をプロジェクトキーに置き換えて使う。保存フィルタにする場合はこのままフィルタ保存すればよい([`jira-features.md`](./jira-features.md)の「1. フィルタ」参照)。

---

## 1. 基本構文だけ覚える

JQLは `フィールド 演算子 値 [AND/OR ...] [ORDER BY フィールド ASC/DESC]` の並び。まずこれだけ覚えれば大半は組める。

```
project = PROJ AND status = "In Progress" ORDER BY updated DESC
```

- `=` / `!=`:一致/不一致
- `IN (...)`:複数値のいずれか
- `~` / `!~`:テキストの部分一致/不一致(summary, descriptionなど)
- `>` `<` `>=` `<=`:日付・数値の比較
- `IS EMPTY` / `IS NOT EMPTY`:未設定/設定済み

## 2. 自分の担当・日常確認用

```
# 自分が担当していて、未完了のチケット
project = PROJ AND assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC

# 自分が起票して、まだ誰もアサインされていないチケット
project = PROJ AND reporter = currentUser() AND assignee IS EMPTY

# 自分がウォッチしているチケットの更新
project = PROJ AND watcher = currentUser() ORDER BY updated DESC
```

## 3. スプリント・進捗管理用

```
# 現在のスプリントの未完了チケット
project = PROJ AND sprint IN openSprints() AND resolution = Unresolved

# 現在のスプリントで、まだ着手されていない(Todo)チケット
project = PROJ AND sprint IN openSprints() AND status = "To Do"

# 次のスプリント(バックログ側)の内容を確認
project = PROJ AND sprint IN futureSprints()

# 見積もり(ストーリーポイント)が未設定のチケット(スプリント計画前のチェック用)
project = PROJ AND sprint IN openSprints() AND "Story Points" IS EMPTY
```

## 4. 期限・遅延の確認用(SCM/PMが毎日見るべき系)

```
# 期限が過ぎているのに未完了
project = PROJ AND duedate < now() AND resolution = Unresolved

# 期限が今日〜3日以内に迫っている未完了チケット
project = PROJ AND duedate >= now() AND duedate <= 3d AND resolution = Unresolved

# 一定期間(7日)更新されていない、放置されている可能性があるチケット
project = PROJ AND resolution = Unresolved AND updated <= -7d

# 直近7日で完了したチケット(週次報告の集計用)
project = PROJ AND status = Done AND resolutiondate >= -7d
```

## 5. 種別・優先度・ラベルでの絞り込み

```
# 優先度High以上のバグだけ
project = PROJ AND issuetype = Bug AND priority IN (Highest, High) AND resolution = Unresolved

# 特定ラベルが付いたチケット(例:リリース対象ラベル)
project = PROJ AND labels = "release-1.2"

# エピックに紐づく子チケット一覧
project = PROJ AND "Epic Link" = PROJ-123
# (Jira Cloudの次世代/チームマネージドプロジェクトでは parent = PROJ-123 の場合もある)
```

## 6. コメント・変更履歴の追跡

```
# 自分がメンションされているチケット
project = PROJ AND text ~ "currentUser()"

# 直近24時間でステータスが変わったチケット
project = PROJ AND status CHANGED AFTER -1d

# 特定ステータス(例: レビュー中)に一度でも入ったことがあるチケット
project = PROJ AND status WAS "In Review"
```

## 7. テキスト検索

```
# タイトル・本文に特定キーワードを含む
project = PROJ AND text ~ "決済エラー"

# タイトルだけを対象に検索(descriptionは見ない)
project = PROJ AND summary ~ "決済エラー"
```

## 8. 複数条件を組み合わせる例(実務でよく使う形)

```
# 自分の担当 かつ (バグ または 優先度High以上) かつ 未完了
project = PROJ AND assignee = currentUser()
  AND (issuetype = Bug OR priority IN (Highest, High))
  AND resolution = Unresolved
ORDER BY priority DESC, duedate ASC
```

括弧でグルーピングしないと`AND`/`OR`の優先順位で意図しない結果になることがあるため、`OR`を混ぜるときは必ず括弧で囲む。

## 9. よく使う関数の早見表

| 関数/値 | 意味 |
|---|---|
| `currentUser()` | 自分自身 |
| `now()` | 現在時刻 |
| `openSprints()` | 進行中のスプリント |
| `futureSprints()` | 未来のスプリント |
| `startOfDay()` / `endOfDay()` | 今日の開始/終了時刻 |
| `-7d` / `3d` | 7日前 / 3日後(相対日付) |
| `resolution = Unresolved` | 未完了(Doneでない)チケット全般に使える定番条件 |

## 10. 権限に関する注意

JQLの実行自体に特別な権限は不要だが、**検索結果に出てくるのは自分が「参照(Browse Projects)」権限を持つプロジェクトのチケットのみ**。「あるはずのチケットが検索に出てこない」場合は、まずJQLの誤りより先に対象プロジェクトへの参照権限を確認する。
