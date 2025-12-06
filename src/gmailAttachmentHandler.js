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

    const config = getConfigFromSpreadsheet();
    if (!config) {
      console.error('スプレッドシートから設定を取得できませんでした。');
      return;
    }
    const { gmailQuery } = config;

    if (!gmailQuery) {
      console.log(`Gmail検索クエリがスプレッドシートの${GMAIL_QUERY_CELL}セルに設定されていません。処理を終了します。`);
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

/**
 * 添付ファイルをGoogle Driveに保存する（重複チェック・リネーム・フォルダ振分け付き）
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment - 保存する添付ファイル
 * @param {GoogleAppsScript.Gmail.GmailMessage} message - 添付ファイルが含まれるメールメッセージ
 * @param {{menu: GoogleAppsScript.Drive.Folder, orderCard: GoogleAppsScript.Drive.Folder}} folders - 保存先フォルダのオブジェクト
 */
function saveAttachment(attachment, message, folders) {
  // 引数 attachment が不正な場合は処理を中断
  if (!attachment) {
    console.error('  - エラー: 不正な添付ファイルデータが渡されました。処理をスキップします。');
    return;
  }

  try {
    const originalFileName = attachment.getName();
    const finalNormalizedFileName = normalizeFileName(originalFileName);
    
    // 処理対象かどうかを判定
    if (!isTargetAttachment(attachment, finalNormalizedFileName)) {
      console.log(`  - ファイル「${originalFileName}(正規化後: ${finalNormalizedFileName})」は処理対象外のため、スキップしました。`);
      return;
    }

    const { newFileName, targetFolder } = getAttachmentDestination(attachment, message, folders);

    saveFileToDrive(attachment, newFileName, targetFolder, originalFileName);

  } catch (e) {
    const fileNameForError = (attachment && typeof attachment.getName === 'function') ? attachment.getName() : '不明なファイル';
    console.error(`  - ファイル「${fileNameForError}」の保存中にエラーが発生しました: ${e.message}`);
  }
}

/**
 * ファイル名を正規化する
 * @param {string} originalFileName - 元のファイル名
 * @returns {string} 正規化されたファイル名
 */
function normalizeFileName(originalFileName) {
  // A. 拡張子の直前にある 'pdf' または 'PDF' をピリオドで置換
  // これで '24pdf.pdf' は '24.pdf' に、'2024.2pdf.pdf' は '2024.2.pdf' になる
  let tempName = originalFileName.replace(/(\d{2,4})(?:pdf|PDF)/, '$1.');

  // B. 英数字とピリオド以外の文字（例: ' や - やスペース）を削除
  // この行の実行後、'24.pdf' は '24.pdf' に、'2024.9[更新済み].pdf' は '2024.9.pdf' になる
  let normalizedFileName = tempName.replace(/[^a-zA-Z0-9\.]/g, '');

  // C. 末尾のpdf拡張子を正規化（pdf.pdf や .pdf.pdf を .pdf に）
  // これで '24.pdf' はそのまま、'24.pdf.pdf' は '24.pdf' になる
  return normalizedFileName.replace(/(?:\.pdf)?\.pdf$/i, '.pdf');
}

/**
 * 添付ファイルが処理対象かどうかを判定する
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment - 添付ファイル
 * @param {string} finalNormalizedFileName - 正規化されたファイル名
 * @returns {boolean} 処理対象であれば true、そうでなければ false
 */
function isTargetAttachment(attachment, finalNormalizedFileName) {
  const contentType = attachment.getContentType();
  if (contentType === 'application/pdf') {
    // MENU_PDF_PATTERN は、finalNormalizedFileName の本体部分にマッチさせる
    const fileNameBody = finalNormalizedFileName.substring(0, finalNormalizedFileName.lastIndexOf('.'));
    return MENU_PDF_PATTERN.test(fileNameBody);
  } else if (contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
             contentType === 'application/vnd.ms-excel') {
    return true; // Excelは常に対象
  }
  return false;
}

/**
 * 添付ファイルの保存先情報（ファイル名とフォルダ）を取得する
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment - 添付ファイル
 * @param {GoogleAppsScript.Gmail.GmailMessage} message - 添付ファイルが含まれるメールメッセージ
 * @param {{menu: GoogleAppsScript.Drive.Folder, orderCard: GoogleAppsScript.Drive.Folder}} folders - 保存先フォルダのオブジェクト
 * @returns {{newFileName: string, targetFolder: GoogleAppsScript.Drive.Folder}} 新しいファイル名と保存先フォルダ
 */
function getAttachmentDestination(attachment, message, folders) {
  const contentType = attachment.getContentType();
  const receivedDate = message.getDate();
  // 翌月の年月を取得
  const nextMonthDate = new Date(receivedDate.getFullYear(), receivedDate.getMonth() + 1, 1);
  const year = nextMonthDate.getFullYear();
  const month = ('0' + (nextMonthDate.getMonth() + 1)).slice(-2);

  let newFileName;
  let targetFolder;

  // PDFの場合はメニューフォルダにリネームして保存
  if (contentType === 'application/pdf') {
    newFileName = `${year}.${month}.pdf`;
    targetFolder = folders.menu;
  } 
  // Excelの場合はオーダーカードフォルダにリネームして保存
  else if (contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    newFileName = `オーダーカード${year}.${month}.xlsx`;
    targetFolder = folders.orderCard;
  } else if (contentType === 'application/vnd.ms-excel') {
    newFileName = `オーダーカード${year}.${month}.xls`;
    targetFolder = folders.orderCard;
  }
  return { newFileName, targetFolder };
}

/**
 * 添付ファイルをGoogle Driveに保存する（重複チェック付き）
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment - 保存する添付ファイル
 * @param {string} newFileName - 保存するファイル名
 * @param {GoogleAppsScript.Drive.Folder} targetFolder - 保存先フォルダ
 * @param {string} originalFileName - 元のファイル名（ログ出力用）
 */
function saveFileToDrive(attachment, newFileName, targetFolder, originalFileName) {
  const files = targetFolder.getFilesByName(newFileName);

  if (files.hasNext()) {
    console.log(`  - ファイル「${newFileName}」は既に「${targetFolder.getName()}」フォルダに存在するため、スキップしました。`);
  } else {
    const blob = attachment.copyBlob();
    blob.setName(newFileName);
    const file = targetFolder.createFile(blob);
    console.log(`  - ファイル「${file.getName()}」を「${targetFolder.getName()}」フォルダに保存しました。(元ファイル名: ${originalFileName})`);
  }
}
