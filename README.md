# Lunch Order Project

社内のお弁当を発注するためのGASプロジェクトです。
主な機能は以下の通りです。

-   Gmailに届いた添付ファイル（メニューPDF、注文書Excel）をGoogle Driveの指定フォルダに自動で保存します。
    -   ExcelファイルはGoogleスプレッドシート形式に自動変換されます（Drive API v3を使用）。
-   Driveに保存されたメニューPDFを自動で読み取り、Gemini APIを使って内容を解析し、スプレッドシートに日付、店名、弁当名を記録します。
-   次週の弁当注文状況を定期的にSlackへ通知します。
-   次週の注文内容を日付×サイズで集計し、オーダーカードスプレッドシートに自動転記し、Gmail下書きを作成します。
-   **オーダー送信後の注文変更を自動検知**し、変更内容をSlackに通知するとともに、更新したオーダーカードのGmail下書きを作成します。

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
| `B8` | メールの送信者名（Gmail下書きの差出人名に使用） | `ランチ発注担当` |
| `B9` | 社名（オーダーカードExcelの会社名欄に使用） | `株式会社サンプル` |
| `B10` | 注文アプリのURL（注文募集アナウンスで使用） | `https://example.com/order-app` |

#### `注文履歴`シート

弁当の注文履歴を記録するためのシートです。以下の列を含めてください。（実際の列数は運用に合わせて調整してください）

| 列 | 説明 |
| :--- | :--- |
| A | 対象日付 (`YYYY/MM/DD` 形式を想定) |
| B | 注文者名 |
| C | サイズ (例: `普通`, `大盛`) |
| D | 店名 |

#### `メニュー`シート

解析結果を書き込むためのシートです。

#### `注文スナップショット`シート

注文変更検知機能で使用するシートです。オーダー送信時の注文状態を保存し、変更検知の基準として使用します。このシートは自動生成されるため、手動での作成は不要です。

## トリガーの設定

本プロジェクトの自動実行には、GASのトリガー設定が必要です。
GASのエディタ画面から、「トリガー」を開き、以下のトリガーを設定してください。

### 📅 週次スケジュール

```mermaid
sequenceDiagram
    participant システム
    participant Slack
    participant 社員
    participant 弁当屋
    
    Note over システム,社員: 水曜日 9:00
    システム->>Slack: 📢 注文募集アナウンス
    Slack->>社員: 来週の注文を受け付けます
    
    Note over システム,社員: 木曜日 9:00
    システム->>Slack: 📊 注文状況報告
    Slack->>社員: 現在の注文状況
    
    Note over システム,弁当屋: 木曜日 11:00
    システム->>システム: ✅ 注文締切・オーダーカード作成
    システム->>弁当屋: Gmail下書き作成
    
    Note over システム,Slack: 毎日 17:00
    システム->>システム: 🔄 注文変更検知
    alt 変更あり
        システム->>Slack: 変更内容を通知
        システム->>弁当屋: 変更後のGmail下書き作成
    end
```

| 時刻 | 曜日 | 機能 | 説明 |
|:---|:---|:---|:---|
| 9:00 | 水曜 | 📢 注文募集アナウンス | 次週の注文受付開始を通知 |
| 9:00 | 木曜 | 📊 注文状況報告 | 現在の注文状況をSlackで共有 |
| 11:00 | 木曜 | ✅ 注文締切 | オーダーカード作成・Gmail下書き生成 |
| 17:00 | 毎日 | 🔄 注文変更検知 | 追加・キャンセルを自動検知して通知 |

### 🔧 トリガー設定詳細

#### 1. Gmail添付ファイルの保存 (`triggerSaveAttachments`)
-   実行するデプロイ: `Head`
-   イベントのソース: `時間主導型`
-   時間ベースのトリガーのタイプ: `日付ベースのタイマー` (例: `1日おき`)

#### 2. PDFメニューの解析 (`triggerProcessPdfMenus`)
-   実行するデプロイ: `Head`
-   イベントのソース: `時間主導型`
-   時間ベースのトリガーのタイプ: `日付ベースのタイマー` (例: `1日おき`)

#### 3. 次週の注文募集アナウンス (`triggerAnnounceNextWeekOrder`)
-   実行するデプロイ: `Head`
-   イベントのソース: `時間主導型`
-   時間ベースのトリガーのタイプ: `週ベースのタイマー`
-   曜日を選択: `水曜日`
-   時刻を選択: `午前9時 ～ 午前10時`

#### 4. ランチ注文状況のSlack通知 (`triggerNotifyLunchOrdersToSlack`)
-   実行するデプロイ: `Head`
-   イベントのソース: `時間主導型`
-   時間ベースのトリガーのタイプ: `週ベースのタイマー`
-   曜日を選択: `木曜日`
-   時刻を選択: `午前9時 ～ 午前10時`

#### 5. 週次注文処理とオーダーカード転記 (`triggerProcessWeeklyOrders`)
-   実行するデプロイ: `Head`
-   イベントのソース: `時間主導型`
-   時間ベースのトリガーのタイプ: `週ベースのタイマー`
-   曜日を選択: `木曜日`
-   時刻を選択: `午前11時 ～ 午後0時`
-   **備考**: 次週のメニューが登録されていない場合、自動的に最大4週間先までメニューを探索し、メニューが存在する週を対象に処理を行います。

#### 6. 注文変更の自動検知と通知 (`triggerDetectOrderChanges`)
-   実行するデプロイ: `Head`
-   イベントのソース: `時間主導型`
-   時間ベースのトリガーのタイプ: `日付ベースのタイマー`
-   時刻を選択: `午後5時 ～ 午後6時`

## 機能詳細

### 注文変更検知機能

オーダー送信後に注文の追加・キャンセルが発生した場合、自動的に検知して対応します。
**※本機能は、対象期間のオーダーメールが送信済みの場合のみ動作します。**

**動作フロー:**
1. 週次注文処理（木曜正午）でオーダーカードとGmail下書きを作成し、その時点の注文状態をスナップショットとして保存
2. 毎日17時頃に今週・次週の注文状況をチェック
3. オーダーメールが送信済みの場合、スナップショットと現在の注文を比較
4. 変更（追加・キャンセル）を検知したら：
   - オーダーカードを最新状態に更新
   - Slackに変更内容を通知（日付・サイズ・変更前後の数量）
   - 更新したオーダーカードを添付したGmail下書きを作成（件名に【変更】を付加）
   - スナップショットを更新

**検知対象:**
- 注文の追加（新規注文）
- 注文のキャンセル（既存注文の削除）
- 日付×サイズごとの数量変化

### 自動スキップ機能

以下の定期実行トリガーは、**対象期間（次週分）の注文メールが既に送信済みの場合、処理を自動的にスキップします**。
これにより、休暇前などで手動で前倒し対応を行った場合に、不要なアナウンスや通知が行われるのを防ぎます。

**スキップ対象の処理:**
1. **次週の注文募集アナウンス** (`triggerAnnounceNextWeekOrder`)
2. **次週の注文状況報告** (`triggerNotifyLunchOrdersToSlack`)
3. **週次注文処理・下書き作成** (`triggerProcessWeeklyOrders`)

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
-   `src/processors/weeklyOrderProcessor.js`: 週次注文処理、オーダーカード転記、Gmail下書き作成の統合処理
-   `src/processors/orderChangeDetector.js`: オーダー送信後の注文変更を検知し、通知とメール下書きを作成する機能

### サービス（外部API連携・基盤機能）
-   `src/services/geminiClient.js`: Gemini APIとの通信を処理する機能
-   `src/services/pdfParser.js`: PDFを解析し、メニュー情報を抽出する機能
-   `src/services/spreadsheetWriter.js`: スプレッドシートへの書き込みを処理する機能
-   `src/services/slackNotifier.js`: Slackへの通知機能
-   `src/services/spreadsheetService.js`: スプレッドシート操作の抽象化レイヤー
-   `src/services/spreadsheetExporter.js`: スプレッドシートをExcel形式でエクスポートする機能
-   `src/services/gmailDraftCreator.js`: Gmail下書きを作成する機能（通常注文・変更通知）
-   `src/services/snapshotService.js`: 注文スナップショットの保存・読み込み機能
-   `src/services/gmailSearchService.js`: Gmailの送信履歴を検索する機能

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

#### 設定・環境確認
-   **`checkConfiguration()`**: 設定のバリデーション（スクリプトプロパティとスプレッドシート設定の確認）
-   **`showEnvironmentInfo()`**: 環境情報の表示（設定値の一覧表示、機密情報は一部マスク）
-   **`runAllTests()`**: 全機能統合テスト（すべてのテストを実行してサマリー表示）

#### 各機能のテスト
-   **`testGmailSearch()`**: Gmail検索機能のテスト
-   **`testGeminiConnection()`**: Gemini API接続テスト
-   **`testSlackNotification()`**: Slack通知テスト（実際にテストメッセージを送信）
-   **`testSpreadsheetAccess()`**: スプレッドシート読み書きテスト
-   **`testOrderAnnouncement()`**: 注文募集アナウンスのテスト（実際にSlackに投稿）

#### 注文変更検知機能のデバッグ
-   **`debugListSnapshots()`**: 保存されているスナップショットの一覧表示
-   **`debugSaveSnapshot()`**: テストデータでスナップショット保存
-   **`debugLoadSnapshot()`**: スナップショットの読み込みテスト
-   **`debugGetWeekdays()`**: 今週・次週の平日日付取得テスト
-   **`debugGmailSearch()`**: Gmail送信済みチェックのテスト
-   **`debugDetectChanges()`**: 変更検知機能の完全テスト
-   **`debugCompareOrders()`**: 注文差分比較のテスト
-   **`debugNotifyChanges()`**: 通知機能（Slack + Gmail下書き）のテスト

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
