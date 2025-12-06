/**
 * Gmailの添付ファイルをGoogle Driveに保存するメイン関数
 */
function saveGmailAttachmentsToDrive() {
  try {
    const folders = getScriptPropertiesAndFolders();
    if (!folders) {
      return;
    }

    console.log(`メニュー用フォルダ: "${folders.menu.getName()}"`);
    console.log(`オーダーカード用フォルダ: "${folders.orderCard.getName()}"`);

    const gmailQuery = getGmailQueryFromSpreadsheet();
    if (!gmailQuery) {
      return;
    }
    console.log(`Gmail検索クエリ: "${gmailQuery}"`);

    processGmailThreads(gmailQuery, folders);

    console.log('すべての処理が完了しました。');

  } catch (e) {
    console.error(`スクリプトの実行中にエラーが発生しました: ${e.message}`);
    console.error(`スタックトレース: ${e.stack}`);
  }
}

/**
 * スクリプトプロパティからフォルダIDを取得し、対応するGoogle Driveフォルダオブジェクトを返す。
 * @returns {{menu: GoogleAppsScript.Drive.Folder, orderCard: GoogleAppsScript.Drive.Folder}|null} フォルダオブジェクト、またはエラーの場合は null
 */
function getScriptPropertiesAndFolders() {
  const properties = PropertiesService.getScriptProperties();
  const menuFolderId = properties.getProperty('FOLDER_ID_MENU');
  const orderCardFolderId = properties.getProperty('FOLDER_ID_ORDER_CARD');

  if (!menuFolderId) {
    console.error('エラー: スクリプトプロパティ「FOLDER_ID_MENU」が設定されていません。');
    return null;
  }
  if (!orderCardFolderId) {
    console.error('エラー: スクリプトプロパティ「FOLDER_ID_ORDER_CARD」が設定されていません。');
    return null;
  }

  return {
    menu: DriveApp.getFolderById(menuFolderId),
    orderCard: DriveApp.getFolderById(orderCardFolderId)
  };
}

/**
 * スプレッドシートからGmail検索クエリを取得する。
 * @returns {string|null} Gmail検索クエリ、またはエラーの場合は null
 */
function getGmailQueryFromSpreadsheet() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    console.error('エラー: スクリプトプロパティ「SPREADSHEET_ID」が設定されていません。');
    return null;
  }
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(PROMPT_SHEET_NAME);
  if (!sheet) {
    console.error(`エラー: スプレッドシートに「${PROMPT_SHEET_NAME}」シートが見つかりません。`);
    return null;
  }
  const gmailQuery = sheet.getRange(GMAIL_QUERY_CELL).getValue();
  if (!gmailQuery) {
    console.log(`検索クエリがスプレッドシートの${GMAIL_QUERY_CELL}セルに設定されていません。処理を終了します。`);
    return null;
  }
  return gmailQuery;
}

/**
 * Gmailの検索、スレッドの反復処理、添付ファイルの処理を行う。
 * @param {string} gmailQuery - Gmail検索クエリ
 * @param {{menu: GoogleAppsScript.Drive.Folder, orderCard: GoogleAppsScript.Drive.Folder}} folders - 保存先フォルダのオブジェクト
 */
function processGmailThreads(gmailQuery, folders) {
  const threads = GmailApp.search(gmailQuery);
  console.log(`${threads.length}件のスレッドが見つかりました。`);

  if (threads.length === 0) {
    console.log('添付ファイルのあるメールが見つかりませんでした。');
    return;
  }

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      const attachments = message.getAttachments();
      if (attachments.length > 0) {
        console.log(`件名「${message.getSubject()}」のメールに${attachments.length}個の添付ファイルが見つかりました。`);
        attachments.forEach(attachment => {
          saveAttachment(attachment, message, folders);
        });
      }
    });
  });
}