---
# 日本語版 — Japanese version of source/projects/dreamapp.html.md, shown at
# /ja/projects/dreamapp/. `project` must still match a title in
# data/ja/projects.yml.
layout: case_study
title: "DreamApp"
description: "夢を記録し、その意味を読み解くためのドリームジャーナルです。夢を記録すると、ユーモアのある解釈が表示され、その夢に合わせた画像が非同期で生成されます。チャット機能を使えば、夢が何を意味するのかをさらに掘り下げることもできます。"
project: "DreamApp"
og_type: "article"
---

<nav class="toc" aria-label="このページの内容" markdown="1">
<p class="toc-label">このページの内容</p>

* TOC
{:toc}
</nav>

## 概要 {#summary}

チームで取り組んだ5日間のプロジェクトで、とても楽しかったです！実際のアプリをクラウド（Heroku）にデプロイしたのも、これが初めてでした。
DreamApp では、夢を記録すると LLM がタイトル、解釈、そしてテーマとシンボルを生成します。夢をイメージした楽しい画像はバックグラウンドで生成され、Turbo Streams 経由でページにプッシュされます。チャットでは、夢の意味について追加で質問することもできます。

開発を通じて学んだ主な新しい概念：

- Devise による認証（OmniAuth 経由の Google OAuth2 サインインを含む）
- Solid Queue によるバックグラウンドジョブ。時間のかかる画像生成をリクエストサイクルから切り離しました
- Action Cable（Solid Cable）上の Turbo Streams によるリアルタイム更新。画像が準備できた瞬間に表示されます
- RubyLLM による LLM 連携：RubyLLM スキーマを使った構造化出力、画像生成、マルチターンのチャット

## 対象ユーザー {#target-user}

夢をすぐ忘れてしまう人、夢日記をつけて、その夢が何を意味するのか振り返りたい人すべてです！

## 課題 {#the-problem}

**「夢を忘れてしまう」**
覚えておきたい夢を見ても、忘れてしまうことはよくあります。これからは記録できます！

**「同じ夢を3回連続で見た。この夢は何を意味するの？」**
3回連続で悪夢を見るのは、何かが心に影響しているサインかもしれません。手遅れになる前に、その解釈を知っておくのがおすすめです！


## 機能 {#features}

かんたんサインイン
: Google でワンクリックでサインインできます。メールアドレスとパスワードでも利用できます。

夢の解釈
: 夢の内容と、そのときの気分を入力します。AI がタイトル、短い解釈、主なテーマとシンボルを生成します。

夢のイラスト
: それぞれの夢に、テーマ・シンボル・ムードをもとにバックグラウンドで生成されるシュールなイラストが付きます。

楽しいローディングメッセージ
: 画像を描いている間、「寝不足のマジシャンに相談中…」のようなメッセージが表示されます。画像は準備ができ次第、リフレッシュなしで表示されます。

夢日記
: 夢は日付順に一覧表示されます。テーマとシンボルはタグになり、クリックすると、同じタグを持つすべての夢を探せます。

追加の質問
: 夢ごとに専用のチャットがあり、特定のディテールが何を意味するのか質問できます。

![ランディングページ：夜空の上に「Understand your dreams.」と表示され、Get Started ボタンがある](/images/projects/dream-app-1.png)
![夢の履歴：日付と AI が生成したタイトルが付いた夢の一覧](/images/projects/dream-app-4.png)
![夢のエントリー：タイトル、日付、ムード、サルの生成イラスト、解釈、テーマタグ](/images/projects/dream-app-5.png)
{: .screens}

## データベース設計 {#database-design}

![DreamApp のデータベーススキーマ。users は複数の dreams を持ち、dreams は複数の messages を持つ](/images/projects/dreamapp-schema.png)

ポイント：

- **ユーザー**は複数の**夢**を持ち、各夢は複数の**メッセージ**を持ちます。メッセージは追加質問のチャットを保持し、それぞれの `role` は `user` または `assistant` です。
- **夢**には、ユーザーが書いた内容（`input` と `mood`）と、AI が返した内容が保存されます。`title` は専用のカラムです。サマリー、テーマ、シンボルは `interpretation` という JSONB カラムにまとめて保存し、`store_accessor` 経由で読み取ります。
- 生成された**画像**は Active Storage で夢に紐づけられ、Cloudinary に保存されます。
- **テーマとシンボル**は、acts-as-taggable-on によって `tags` テーブルと `taggings` テーブルにもタグとして保存されます。これがタグによる絞り込みリンクの仕組みです。

## 技術的な課題 {#technical-challenges}

### Devise を使った Google OAuth2 {#google-oauth2-with-devise}

Google サインインには、通常のメール・パスワードログインに加えて、`omniauth-google-oauth2` と Devise の `:omniauthable` モジュールを使っています。

![メール・パスワード欄、Log in ボタン、「Easy Login with Google」ボタンがあるサインインページ](/images/projects/dream-app-2.png)
{: .screens}

1. **ユーザーが「Easy Login with Google」をクリック**
   このボタンは `omniauth-rails_csrf_protection` で保護された POST リクエストを送信し、ブラウザがリダイレクトを追従できるよう Turbo をオフにしています。これで OAuth2 の認可コードフローが始まり、ユーザーは Google の同意画面に移動します。

2. **Google が code を付けてリダイレクトで戻す**
   OmniAuth がその code をアクセストークンと交換し、ユーザーの Google プロフィールを取得します。

3. **`Users::OmniauthCallbacksController` がコールバックを処理**
   `User.from_omniauth` が `provider` と `uid` でユーザーを検索します。一致するユーザーがいなければ、Google のメールアドレスと、`Devise.friendly_token` で生成したランダムなパスワードで新しいユーザーを作成し、コントローラーが保存します。その後 Devise がセッションベースの認証でユーザーをサインインさせ、元々アクセスしようとしていたページ、またはホームページに遷移させます。ユーザーがパスワードを設定する必要はありません。


### 画像生成の Solid Queue へのオフロード {#offloading-image-generation-to-solid-queue}

リクエスト内で画像を生成すると、ユーザーが離脱してしまうほど遅くなっていました。解決策は、画像生成をバックグラウンドジョブに移すことでした。

1. **`ImageGenerationJob.perform_later(@dream, result)`** は、`create` の最後、テキストの解釈を保存した直後に呼び出されます。ユーザーは画像を待たずに夢のページにリダイレクトされます。

2. **ジョブが画像プロンプトを作成**します。解釈のサマリー、テーマ、シンボルにユーザーのムードを加えてプロンプトを作り、`RubyLLM.paint` を呼び出します。

3. **画像は Active Storage で夢に添付**され、Cloudinary にアップロードされます。

4. **Turbo Stream のブロードキャスト**が、夢のページ上のローディングメッセージを完成した画像に置き換えるので、リフレッシュは不要です。

5. **Solid Queue は Puma 内で動作**します（`plugin :solid_queue`）。web dyno がジョブも処理するため、別の worker dyno は必要ありません。Solid Queue、Solid Cache、Solid Cable はすべて、アプリの単一の Postgres データベースを使っています。

### Turbo Streams によるリアルタイム更新 {#real-time-updates-with-turbo-streams}

画像の準備ができたときに、夢のページでリフレッシュやポーリング用の JavaScript を必要としないようにしたいと考えました。

![画像生成中の夢のエントリー。解釈の上に、スピナーと「Consulting a sleep-deprived magician...」というメッセージが表示されている](/images/projects/dream-app-3.png)
{: .screens}

1. **夢のページは購読します**。Solid Cable を裏側に持つ Action Cable 上で、`turbo_stream_from @dream` によって購読します。

2. **画像がまだ存在しない間は**、`dom_id(@dream)` を持つラッパーの `<div>` にスピナーが表示されます。その隣では、Stimulus コントローラーが Typed.js を使って、「寝不足のマジシャンに相談中…」のようなメッセージを切り替えながらタイピング表示します。

3. **`ImageGenerationJob` が完了すると**、`Turbo::StreamsChannel.broadcast_replace_to` を呼び出し、そのラッパーをレンダリング済みの画像パーシャルに置き換えます。古い要素が削除される際に、Stimulus コントローラーの `disconnect()` が Typed.js のインスタンスをクリーンアップします。

4. **チャットも Turbo Streams を使っています**が、ブロードキャストは行いません。メッセージを送信すると `create.turbo_stream.erb` が返され、ユーザーのメッセージと AI の返信がリストに追加され、チャット入力欄が再レンダリングされてクリアされます。

## 完成形 {#final-result}

アプリは [dream-app-lewagon-991343bdff0f.herokuapp.com](https://dream-app-lewagon-991343bdff0f.herokuapp.com/user/sign_in){:target="_blank" rel="noopener noreferrer"} で試せます。
