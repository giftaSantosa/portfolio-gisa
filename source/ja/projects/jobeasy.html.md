---
# 日本語版 — Japanese version of source/projects/jobeasy.html.md, shown at
# /ja/projects/jobeasy/. `project` must still match a title in
# data/ja/projects.yml.
layout: case_study
title: "JobEasy"
description: "日本で就職活動をするジュニアエンジニア向けの、求人集約・応募管理アプリです。Wantedly、CareerForum、japan-dev などのサイトから毎朝求人をスクレイピングします。AIによる履歴書フィードバック、ブラウザ内の履歴書エディタ、面接コーチ機能があり、その求人に本当に応募する価値があるかも判定します。"
project: "JobEasy"
og_type: "article"
cover: "projects/jobeasy-main.png"
cover_alt: "JobEasy のホーム画面。「Your job search, all in one place」という見出しと、応募トラッカーのプレビュー"
---

<nav class="toc" aria-label="このページの内容" markdown="1">
<p class="toc-label">このページの内容</p>

* TOC
{:toc}
</nav>

## 概要 {#summary}

JobEasy は、ジュニアエンジニアの就職活動を1つのアプリにまとめます。Wantedly、CareerForum、japan-dev から毎朝ジュニア向けの求人をスクレイピングし、その求人に応募する価値があるかを判定します。ブラウザを離れずに履歴書を調整でき、応募ごとにタスクリストと面接コーチも使えます。

このアプリを作って新しく学んだこと：

- Devise によるセッションベースの認証と、Pundit による認可
- JSON API とプレーンな HTML を対象にした、バックグラウンドジョブでの定期スクレイピング
- JWT 認証とコールバックを使った、サードパーティ API（OnlyOffice テキストエディタ）の連携
- RubyLLM 経由での OpenAI 連携と、レスポンスの JSONB 保存（RubyLLM Schema）


## 対象ユーザー {#target-user}

日本で就職活動をしているジュニアエンジニアです。1社目や2社目のエンジニア職に応募する人が多く、複数の求人サイトを同時に使っている人を想定しています。

## 課題 {#the-problem}

**「LinkedIn でジュニア求人が見つからない」**
多くのジュニアエンジニアは LinkedIn を求人サイトとして使っていますが、LinkedIn は最も競争が激しいサイトです。競争の少ない小さな求人サイトはたくさんありますが、毎日すべてをチェックし続けるのは現実的ではありません。

**「自分は条件を満たしていないから、応募しない」**
「経験2年以上」と書かれた時点で応募をあきらめるジュニアは多いです。実際には十分にチャンスがある場合でも、応募する価値があるかを簡単に判断する方法がありません。

**「就活で使うツールが多すぎる」**
就活の作業が、5〜10個の求人サイトのログイン、管理用のスプレッドシート、求人ごとに履歴書を直すための Microsoft Word、別タブで開く Claude や ChatGPT（面接対策用）に分散しています。

**「応募や面接のあと、何をすればいいかわからない」**
応募や面接を記録したあとは、次の行動がはっきりしません。フォローアップのリマインドもなく、面接で何を聞かれるかを整理する方法もありません。

## 機能 {#features}

求人の一括集約
: 複数のサイト（Wantedly、CareerForum、japan-dev）の求人をスクレイピングし、1つのフィードにまとめます。毎日10個以上の求人サイトを手動でチェックする必要はありません。

AIによる「応募する価値があるか」の判定
: 各求人をあなたの履歴書と照らし合わせ、構造化された形で率直にフィット感を判定します。「経験2年以上」と書かれていても、応募できる範囲かを確認する前にあきらめる必要はありません。

オールインワンのワークフロー
: ブラウザ内の履歴書エディタで、アプリを離れたり Word を開いたりせずに、求人ごとに CV を調整できます。応募状況も別のスプレッドシートではなく、アプリ内で管理できます。

面接コーチとタスクリスト
: 応募ごとにチャット形式のコーチと ToDo リストがあり、次に何をすべきか、何をフォローアップすべきかで迷いません。

![応募トラッカー。Saved、Applied、Interviewed、Offered、Accepted の列があり、各カードに会社名、日付、タスク数が表示される](/images/projects/jobeasy-applications.png)

## データベース設計 {#database-design}

![JobEasy のデータベーススキーマ](/images/projects/jobeasy-schema.png)


ポイント：

- **Users と JobOpenings** は、中間テーブル `job_applications` で関連付けています。User は複数の job_applications を持ち、job_applications を通じて複数の job_openings を持ちます。
- **Resumes と job_applications** は 1:N の関係なので、`resumes` テーブルに外部キーを持たせています。User は job_applications を通じて複数の resumes を持ち、各 Resume は1つの job_application に属します。

## 技術的な課題 {#technical-challenges}

### OnlyOffice API 連携 {#onlyoffice-api-integration}

アプリにテキストエディタを組み込むために、いろいろな選択肢を試しました。最終的に OnlyOffice を選んだ理由は次の3つです。

1. UI が見やすい
2. 同時保存ができる
3. CV のインデント、太字などのスタイルを保持できる

![OnlyOffice のエディタで CV を開いた画面。「Apply for this job」と「Ask JobEasy for suggestions」のボタン、右側に AI アドバイスのカード](/images/projects/jobeasy-resume.png)

全体の流れ：

1. **履歴書をアップロード**
   - ユーザーが `.docx` をアップロードすると、`POST /resumes` が呼ばれます。
   - ファイルは、`Resume` インスタンスに Active Storage（Cloudinary）ファイルとして保存されます。
   - `extract_content` が文書をテキストに変換し、`Resume` の `content` として保存します。
   - このインスタンス用に、ランダムなコールバックトークンを作成します。
   - 完了後、ユーザーは履歴書の編集ページ（`GET /resumes/:id/edit`）にリダイレクトされます。

2. **Rails が署名付きのエディタ設定を作成**
   - `ResumesController#edit` が OnlyOffice エディタ用の設定ハッシュを作り、JWT で署名します。
   - 設定は編集ページに埋め込まれ、ブラウザが `DocsAPI.DocEditor` に渡し、OnlyOffice サーバーに送られます。
   - JWT の構成：
     - **Header：** HS256 アルゴリズム
     - **Payload：** ドキュメント URL（Cloudinary URL）、ドキュメントキー、ファイルタイプ、コールバック URL、ユーザーのハッシュ
     - **Signature：** Header と Payload を `ONLYOFFICE_JWT_SECRET` で HS256 署名したもの

   ドキュメント：[Config](https://api.onlyoffice.com/docs/docs-api/usage-api/config/)、[Document](https://api.onlyoffice.com/docs/docs-api/usage-api/config/document/)、[Editor](https://api.onlyoffice.com/docs/docs-api/usage-api/config/editor/)

3. **ブラウザがエディタを表示**
   - ビューが OnlyOffice サーバーから `api.js` をスクリプトとして読み込みます。

4. **OnlyOffice がファイルを取得**
   - OnlyOffice サーバーが、共有シークレットで設定の JWT を検証します。
   - Cloudinary URL から `.docx` をダウンロードします。
   - ファイルを変換し、`document.key` をキーにキャッシュします。このキーは保存のたびに変わります。

5. **ユーザーが編集**
   - エディタを閉じると保存が始まります。OnlyOffice が編集内容から完成した `.docx` を作り、`status: 2` と完成ファイルへのリンクを付けて、コールバック URL にリクエストを送ります。

6. **バックグラウンドジョブが新しいバージョンを保存**
   - `ResumeSaveJob` が完成した `.docx` をダウンロードし、Cloudinary 上の古いファイルを新しいファイルに置き換えます。
   - Resume の `updated_at` を更新します。これで `document.key` が変わるため、次回のエディタセッションでは新しいファイルが読み込まれます。

### 求人スクレイパー {#job-board-scraper}

3つのバックグラウンドジョブを、rake タスクから起動します。このタスクを Heroku Scheduler で、毎日日本時間の朝9時に実行しています。

![JobEasy の求人一覧。Accenture、Otsuka、BrainPad、Game Freak の求人。All、CFN、Japandev、Wantedly のフィルターと、ジュニア求人56件の表示](/images/projects/jobeasy-list.png)

全体の流れ：

1. **Heroku Scheduler が** `rails jobs:scrape` **を実行します。**

2. **`ScrapeJapandevJob`**
   - Japan Dev の Meilisearch API にリクエストを送り、`junior` と `new_grad` のシニオリティで絞り込みます。
   - 各求人について、その会社の求人を API から取得し、詳細な職務内容と会社情報を得ます。
   - HTML の職務内容を Nokogiri でプレーンテキストに変換します。
   - リクエスト間に0.3秒の sleep を入れます。
   - 結果を会社と求人のハッシュの配列に保存し、それをもとに `Company` と `JobOpening` のレコードを作成します。

3. **`ScrapeCFNJob`**
   - 会社一覧 API の1〜12ページを、「IT」を含むカテゴリーで絞り込んで取得します。
   - 各求人について、求人 API から職務内容と給与を取得します。正規表現で「円」で終わる金額を抽出します。
   - 結果を会社と求人のハッシュの配列に保存し、それをもとに `Company` と `JobOpening` のレコードを作成します。

4. **`ScrapeWantedlyJob`**
   - 「Ruby」「Tokyo」「未経験」で検索した結果の1〜5ページを取得します。
   - CSS セレクターで HTML から求人情報を抽出します。
   - 各求人ページを開き、職務内容、会社情報、給与を取得します。
   - 結果を会社と求人のハッシュの配列に保存し、それをもとに `Company` と `JobOpening` のレコードを作成します。

### CV 提案のための RubyLLM スキーマ {#rubyllm-schema-for-cv-recommendations}

履歴書の編集ページで「Ask JobEasy for suggestions」をクリックすると、Rails が履歴書のテキストと求人の職務内容を、RubyLLM 経由で OpenAI に送ります。構造化された回答を得るために、レスポンスを JSONB として保存しています。この過程で RubyLLM のスキーマ（`AiResponseSchema`）の使い方を学びました。

1. **履歴書のテキストを取得**
   - アップロードの流れと同じで、ドキュメントは `Resume` に Active Storage（Cloudinary）ファイルとして保存されています。`extract_content` がテキストに変換し、`content` として保存します。

2. **ユーザーが提案をリクエスト**
   - ボタンが `POST /resumes/:id/recommendations` を送ります。

3. **レスポンスの形を定義**
   - `ai_response` JSONB の形を、事前に定義します。

   ~~~ ruby
   class AiResponseSchema < RubyLLM::Schema
     string :order_advice,      description: "..."   # プロジェクト/経験をどこに置くか
     string :summary_advice,    description: "..."   # 冒頭のサマリーの書き方
     array  :additional_advice, of: :string, description: "..."  # 追加のアドバイス（最大5件）
   end
   ~~~

4. **LLM を呼び出す**
   - `ResumesController` の `recommendations` アクションが LLM を呼びます。

   ~~~ ruby
   chat = RubyLLM.chat.with_schema(AiResponseSchema)
   response = chat.ask("You are a professional tech recruiter ... #{@resume.content} ... #{job_opening.title} ... #{job_opening.content} ...")
   ~~~

5. **構造化された結果を読み取って保存**

6. **提案を表示**
   - アドバイスは1件ずつカードとして表示されます。「×」をクリックすると `DELETE /resumes/:id/advices/:advice_id` が送られ、そのアドバイスの id が `ai_response["dismissed"]` に追加されます。

## 完成したアプリ {#final-result}

アプリは [jobeasy.space](https://www.jobeasy.space){:target="_blank" rel="noopener noreferrer"} で試せます。
