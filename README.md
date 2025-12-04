# Lanch Order Project

社内のお弁当を発注するためのGASプロジェクトです

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

## 開発

-   **リモートのコードを取得する (pull)**
    ```bash
    clasp pull
    ```

-   **ローカルのコードを反映する (push)**
    ```bash
    clasp push
    ```

## 使用ライブラリ

(このGASプロジェクトで使用しているライブラリやGoogleのAPIを記述します)

-   SpreadsheetApp
-   GmailApp
