# Lanch Order Project

社内のお弁当を発注するためのGASプロジェクトです。
主な機能は以下の通りです。

-   Gmailに届いた添付ファイル（メニューPDF、注文書Excel）をGoogle Driveの指定フォルダに自動で保存します。
-   Driveに保存されたメニューPDFを自動で読み取り、Gemini APIを使って内容を解析し、スプレッドシートに日付、店名、弁当名を記録します。

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
| `SPREADSHEET_ID` | 設定やメニュー情報を管理するGoogleスプレッドシートのID | `abcdefg12345` |
| `GEMINI_API_KEY` | Gemini APIを利用するためのAPIキー | `AIzaSy...` |

### 2. スプレッドシート

スクリプトプロパティで指定したスプレッドシートに、`プロンプト`という名前のシートを作成し、以下のセルを設定してください。

| セル | 説明 | 例 |
| :--- | :--- | :--- |
| `B2` | 添付ファイル付きメールを検索するためのGmail検索クエリ | `from:example@example.com subject:お弁当` |
| `B3` | PDF解析に使用するGeminiのモデル名 | `gemini-pro-vision` |
| `B4` | PDF解析を指示するためのGeminiへのプロンプト | `このPDFから日付と弁当名をJSON形式で抽出してください...` |

また、解析結果を書き込むために`メニュー`という名前のシートも作成しておいてください。

## トリガーの設定

本プロジェクトの自動実行には、GASのトリガー設定が必要です。
GASのエディタ画面から、「トリガー」を開き、以下の2つのトリガーを設定してください。

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

-   `src/main.js`: GASのトリガーから呼び出されるエントリーポイント。
-   `src/constants.js`: プロジェクト全体で共有される定数。
-   `src/config.js`: スプレッドシートから設定値を取得する機能。
-   `src/gmailAttachmentHandler.js`: Gmailの添付ファイルをDriveに保存する機能。
-   `src/pdfMenuProcessor.js`: PDFメニューの処理フロー全体を管理する機能。
-   `src/pdfParser.js`: PDFを解析し、メニュー情報を抽出する機能。
-   `src/geminiClient.js`: Gemini APIとの通信を処理する機能。
-   `src/spreadsheetWriter.js`: スプレッドシートへの書き込みを処理する機能。

## 使用ライブラリ

本プロジェクトでは、以下のGoogle Apps ScriptサービスおよびAPIを使用しています。

-   `SpreadsheetApp`: Google スプレッドシートの操作
-   `GmailApp`: Gmail の操作
-   `DriveApp`: Google Drive の操作
-   `PropertiesService`: スクリプトプロパティの管理
-   `UrlFetchApp`: 外部リソース（Gemini API）へのHTTPリクエスト
-   `Utilities`: ユーティリティ機能（Base64エンコードなど）
-   `Gemini API`: PDFメニューの解析
