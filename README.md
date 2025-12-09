# Lanch Order Project

社内のお弁当を発注するためのGASプロジェクトです。
主な機能は以下の通りです。

-   Gmailに届いた添付ファイル（メニューPDF、注文書Excel）をGoogle Driveの指定フォルダに自動で保存します。
    -   ExcelファイルはGoogleスプレッドシート形式に自動変換されます（Drive API v3を使用）。
-   Driveに保存されたメニューPDFを自動で読み取り、Gemini APIを使って内容を解析し、スプレッドシートに日付、店名、弁当名を記録します。
-   次週の弁当注文状況を定期的にSlackへ通知します。
-   次週の注文内容を日付×サイズで集計し、オーダーカードスプレッドシートに自動転記します。

## 環境構築

ローカルで開発を行うには、[clasp](https://github.com/google/clasp) が必要です。

1.  **Node.jsのインストール**
    [Node.js](https://nodejs.org/)公式サイトからLTS版をインストールしてください。

2.  **claspのインストール**
    ```bash
    npm install -g @google/clasp
    ```

3.  **Googleアカウントへのログイン**
    ```bash
    clasp login
    ```

4.  **プロジェクトのクローン**
    GASのプロジェクトIDを指定して、既存のプロジェクトをクローンします。
    ```bash
    # .clasp.json に scriptId が設定済みの場合は不要
    clasp clone <scriptId>
    ```

## 必須設定

本プロジェクトを動作させるには、以下の設定が必要です。

### 1. スクリプトプロパティ

GASのエディタ画面から、「プロジェクトの設定」 > 「スクリプトプロパティ」を開き、以下のキーと値を設定してください。

| キー | 説明 | 例 |
| :--- | :--- | :--- |
| `FOLDER_ID_MENU` | メニュー表のPDFが保存されるGoogle DriveのフォルダID | `1a2b3c4d5e6f7g8h9i0` |
| `FOLDER_ID_ORDER_CARD` | 注文書のExcelファイルが保存されるGoogle DriveのフォルダID | `0i9h8g7f6e5d4c3b2a1` |
| `SPREADSHEET_ID` | 設定やメニュー情報、注文履歴を管理するGoogleスプレッドシートのID | `abcdefg12345` |
| `GEMINI_API_KEY` | Gemini APIを利用するためのAPIキー | `AIzaSy...` |

### 2. スプレッドシート

スクリプトプロパティで指定したスプレッドシートに、以下のシートとセルを設定してください。

#### `情報`シート

| セル | 説明 | 例 |
| :--- | :--- | :--- |
| `B2` | 添付ファイル付きメールを検索するためのGmail検索クエリ | `from:example@example.com subject:お弁当` |
| `B3` | PDF解析に使用するGeminiのモデル名 | `gemini-pro-vision` |
| `B4` | PDF解析を指示するためのGeminiへのプロンプト | `このPDFから日付と弁当名をJSON形式で抽出してください...` |
| `B6` | Slackへの通知に使用するBot Token (`xoxb-` から始まる) | `xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxx` |
| `B7` | Slackへの通知先のチャンネルID (`C` または `G` から始まる) | `C1234567890` |

#### `注文履歴`シート

弁当の注文履歴を記録するためのシートです。以下の列を含めてください。（実際の列数は運用に合わせて調整してください）

| 列 | 説明 |
| :--- | :--- |
| A | 対象日付 (`YYYY/MM/DD` 形式を想定) |
| B | 注文者名 |
| C | サイズ (例: `普通`, `大盛`) |

また、解析結果を書き込むために`メニュー`という名前のシートも作成しておいてください。

## トリガーの設定

本プロジェクトの自動実行には、GASのトリガー設定が必要です。
GASのエディタ画面から、「トリガー」を開き、以下のトリガーを設定してください。

1.  **Gmail添付ファイルの保存**
    -   実行する関数: `triggerSaveAttachments`
    -   実行するデプロイ: `Head`
    -   イベントのソース: `時間主導型`
    -   時間ベースのトリガーのタイプ: `日付ベースのタイマー` や `時間ベースのタイマー` など、要件に合わせて設定（例: `1日おき`）
2.  **PDFメニューの解析**
    -   実行する関数: `triggerProcessPdfMenus`
    -   実行するデプロイ: `Head`
    -   イベントのソース: `時間主導型`
    -   時間ベースのトリガーのタイプ: `日付ベースのタイマー` や `時間ベースのタイマー` など、要件に合わせて設定（例: `1日おき`）
3.  **ランチ注文状況のSlack通知**
    -   実行する関数: `triggerNotifyLunchOrdersToSlack`
    -   実行するデプロイ: `Head`
    -   イベントのソース: `時間主導型`
    -   時間ベースのトリガーのタイプ: `週ベースのタイマー`
    -   曜日を選択: `木曜日`
    -   時刻を選択: `午前7時 ～ 午前8時` (例: 毎週木曜日の朝に通知)
4.  **オーダーカードへの注文転記**
    -   実行する関数: `triggerWriteOrderCard`
    -   実行するデプロイ: `Head`
    -   イベントのソース: `時間主導型`
    -   時間ベースのトリガーのタイプ: `週ベースのタイマー`
    -   曜日を選択: `木曜日`
    -   時刻を選択: `午後0時 ～ 午後1時` (例: 毎週木曜日の正午に転記)

## 開発

-   **リモートのコードを取得する (pull)**
    ```bash
    clasp pull
    ```

-   **ローカルのコードを反映する (push)**
    ```bash
    clasp push
    ```

## ファイル構成

このプロジェクトは、機能ごとにファイルが分割されています。

### エントリーポイント
-   `src/main.js`: GASのトリガーから呼び出されるエントリーポイント関数群
-   `src/debug.js`: デバッグ・テスト用の関数群（スクリプトエディタから手動実行）

### プロセッサー（処理フロー）
-   `src/processors/gmailAttachmentHandler.js`: Gmailの添付ファイルをDriveに保存する機能（Excel→Sheets自動変換含む）
-   `src/processors/pdfMenuProcessor.js`: PDFメニューの処理フロー全体を管理する機能
-   `src/processors/lunchOrderProcessor.js`: ランチ注文状況の処理とSlack通知を行うメインロジック
-   `src/processors/orderCardWriter.js`: 次週の注文内容を集計してオーダーカードに転記する機能

### サービス（外部API連携）
-   `src/services/geminiClient.js`: Gemini APIとの通信を処理する機能
-   `src/services/pdfParser.js`: PDFを解析し、メニュー情報を抽出する機能
-   `src/services/spreadsheetWriter.js`: スプレッドシートへの書き込みを処理する機能
-   `src/services/slackNotifier.js`: Slackへの通知機能
-   `src/services/spreadsheetService.js`: スプレッドシート操作の抽象化レイヤー

### ユーティリティ
-   `src/utils/constants.js`: プロジェクト全体で共有される定数と設定バリデーション
-   `src/utils/configService.js`: スプレッドシートから設定値を取得する機能
-   `src/utils/propertyManager.js`: スクリプトプロパティへのアクセスを一元管理
-   `src/utils/errorHandler.js`: エラーハンドリングの共通処理
-   `src/utils/result.js`: 統一的なレスポンス型（Result型）
-   `src/utils/logger.js`: ログレベルに対応した構造化ロギング
-   `src/utils/dateUtils.js`: 日付関連のユーティリティ機能
-   `src/utils/dataFetcher.js`: スプレッドシートからデータを取得する機能
-   `src/utils/messageFormatter.js`: Slackメッセージのフォーマット関連機能
-   `src/utils/fileNameUtils.js`: ファイル名の正規化と検証機能

## デバッグ・テスト

`src/debug.js`には、各機能の動作確認用の関数が用意されています。
GASのスクリプトエディタから手動で実行できます。

### 主なデバッグ関数

-   **`checkConfiguration()`**: 設定のバリデーション（スクリプトプロパティとスプレッドシート設定の確認）
-   **`showEnvironmentInfo()`**: 環境情報の表示（設定値の一覧表示、機密情報は一部マスク）
-   **`testGmailSearch()`**: Gmail検索機能のテスト
-   **`testGeminiConnection()`**: Gemini API接続テスト
-   **`testSlackNotification()`**: Slack通知テスト（実際にテストメッセージを送信）
-   **`testSpreadsheetAccess()`**: スプレッドシート読み書きテスト
-   **`runAllTests()`**: 全機能統合テスト（すべてのテストを実行してサマリー表示）

### 初期セットアップ時の確認手順

1.  スクリプトプロパティとスプレッドシートを設定
2.  GASエディタで`checkConfiguration()`を実行して設定を確認
3.  `showEnvironmentInfo()`で環境情報を表示
4.  `runAllTests()`ですべての機能が正常動作するか確認

## 使用ライブラリ

本プロジェクトでは、以下のGoogle Apps ScriptサービスおよびAPIを使用しています。

-   `SpreadsheetApp`: Google スプレッドシートの操作
-   `GmailApp`: Gmail の操作
-   `DriveApp`: Google Drive の操作
-   `Drive API (v3)`: Excel→Googleスプレッドシート自動変換（Advanced Service）
-   `PropertiesService`: スクリプトプロパティの管理
-   `UrlFetchApp`: 外部リソース（Gemini API, Slack API）へのHTTPリクエスト
-   `Utilities`: ユーティリティ機能（Base64エンコードなど）
-   `Gemini API`: PDFメニューの解析
-   `Slack API`: メッセージ投稿

### Advanced Servicesの有効化

本プロジェクトでは、Excel→Googleスプレッドシート自動変換のために**Drive API v3**を使用しています。
GASエディタで以下の手順で有効化してください。

1.  GASエディタの左メニューから「サービス」を選択
2.  「サービスを追加」をクリック
3.  「Drive API」を選択
4.  バージョンは「v3」を選択
5.  「追加」をクリック
