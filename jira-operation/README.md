# jira-operation について

SCM/PM(ユーザーの役割)がJiraのチケット管理・運用に時間を取られすぎないための、機能・JQL・ショートカットの実践ガイド集。「Jiraを使いこなせていない」状態から、日常のチケット管理を素早くこなせる状態を目指すためのドキュメント群。

対象読者:Jiraでのチケット管理を任されているが、検索・フィルタ・一括操作などの機能をまだ使いこなせていない人。

## ドキュメント一覧

- [`jira-features.md`](./jira-features.md) — SCM/PMが押さえておきたいJiraの機能(ボード、フィルタ、ダッシュボード、一括編集、自動化など)と、各機能を使うために必要な権限
- [`jql-jql-cheatsheet.md`](./jql-cheatsheet.md) — 1プロジェクト内での運用を想定した、よく使うJQLのチートシート(コピペして使える形)
- [`jira-shortcuts.md`](./jira-shortcuts.md) — Jiraのキーボードショートカット一覧(チケット作成・遷移・検索などの操作を素早く行うためのもの)
- [`confluence-shortcuts.md`](./confluence-shortcuts.md) — Confluenceのキーボードショートカット一覧(議事録・仕様書作成を素早く行うためのもの)

## 使い方の想定

- 新しいフィルタ/ダッシュボードを作りたい → まず`jira-features.md`で該当機能と必要な権限を確認
- 「このステータスかつこの担当者のチケットを見たい」等 → `jql-cheatsheet.md`から近いクエリを探して条件を書き換える
- 日常操作を早くしたい → `jira-shortcuts.md` / `confluence-shortcuts.md`を一度眺めて、よく使う操作だけ覚える

権限はJiraのプラン(Free/Standard/Premium)やサイトの設定によって名称・付与範囲が異なる場合がある。ここでの権限名はJira Cloudの一般的な名称(プロジェクト権限スキームの権限名)に基づく。
