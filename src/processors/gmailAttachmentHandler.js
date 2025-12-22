/**
 * Gmailの添付ファイルをGoogle Driveに保存するメイン関数
 */
function saveGmailAttachmentsToDrive() {
  const logger = getContextLogger('saveGmailAttachmentsToDrive');

  try {
    const folders = getScriptPropertiesAndFolders();
    if (!folders) {
      return;
    }

    logger.info(`メニュー用フォルダ: "${folders.menu.getName()}"`);
    logger.info(`オーダーカード用フォルダ: "${folders.orderCard.getName()}"`);

    const config = getConfig();
    if (!config) {
      logger.error('設定を取得できませんでした。処理を終了します。');
      return;
    }
    const { gmailQuery } = config;
    logger.debug(`Gmail検索クエリ: "${gmailQuery}"`);

    processGmailThreads(gmailQuery, folders);

    logger.info('すべての処理が完了しました。');
  } catch (e) {
    handleError(e, 'saveGmailAttachmentsToDrive');
  }
}

/**
 * 情報シートのB9セルから社名を取得
 * @returns {string} 社名（取得できない場合は空文字列）
 */
function getCompanyNameFromPromptSheet() {
  const logger = getContextLogger('getCompanyNameFromPromptSheet');

  try {
    const propertyManager = getPropertyManager();
    const spreadsheetId = propertyManager.getSpreadsheetId();
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(PROMPT_SHEET_NAME);

    if (!sheet) {
      logger.error(`シート「${PROMPT_SHEET_NAME}」が見つかりません。`);
      return '';
    }

    // B9セルから社名を取得
    const companyName = sheet.getRange(COMPANY_NAME_CELL).getValue();

    if (!companyName) {
      logger.warn('B9セルに社名が設定されていません。');
      return '';
    }

    logger.debug(`社名を取得しました: ${companyName}`);
    return companyName;
  } catch (e) {
    handleError(e, 'getCompanyNameFromPromptSheet');
    return '';
  }
}

/**
 * スクリプトプロパティからフォルダIDを取得し、対応するGoogle Driveフォルダオブジェクトを返す。
 * @returns {{menu: GoogleAppsScript.Drive.Folder, orderCard: GoogleAppsScript.Drive.Folder}|null} フォルダオブジェクト、またはエラーの場合は null
 */
function getScriptPropertiesAndFolders() {
  try {
    const propertyManager = getPropertyManager();
    const menuFolderId = propertyManager.getMenuFolderId();
    const orderCardFolderId = propertyManager.getOrderCardFolderId();

    return {
      menu: DriveApp.getFolderById(menuFolderId),
      orderCard: DriveApp.getFolderById(orderCardFolderId),
    };
  } catch (e) {
    handleError(e, 'getScriptPropertiesAndFolders');
    return null;
  }
}

/**
 * Gmailの検索、スレッドの反復処理、添付ファイルの処理を行う。
 * @param {string} gmailQuery - Gmail検索クエリ
 * @param {{menu: GoogleAppsScript.Drive.Folder, orderCard: GoogleAppsScript.Drive.Folder}} folders - 保存先フォルダのオブジェクト
 */
function processGmailThreads(gmailQuery, folders) {
  const logger = getContextLogger('processGmailThreads');
  const threads = GmailApp.search(gmailQuery);
  logger.info(`${threads.length}件のスレッドが見つかりました。`);

  if (threads.length === 0) {
    logger.warn('添付ファイルのあるメールが見つかりませんでした。');
    return;
  }

  threads.forEach((thread) => {
    thread.getMessages().forEach((message) => {
      const attachments = message.getAttachments();
      if (attachments.length > 0) {
        logger.debug(
          `件名「${message.getSubject()}」のメールに${attachments.length}個の添付ファイルが見つかりました。`
        );
        attachments.forEach((attachment) => {
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
  const logger = getContextLogger('saveAttachment');
  // 引数 attachment が不正な場合は処理を中断
  if (!attachment) {
    logger.error('  - エラー: 不正な添付ファイルデータが渡されました。処理をスキップします。');
    return;
  }

  try {
    const originalFileName = attachment.getName();
    const finalNormalizedFileName = normalizeFileName(originalFileName);

    // 処理対象かどうかを判定
    if (!isTargetAttachment(attachment, finalNormalizedFileName)) {
      logger.debug(
        `  - ファイル「${originalFileName}(正規化後: ${finalNormalizedFileName})」は処理対象外のため、スキップしました。`
      );
      return;
    }

    const { newFileName, targetFolder } = getAttachmentDestination(attachment, message, folders);

    const contentType = attachment.getContentType();
    saveFileToDrive(attachment, newFileName, targetFolder, originalFileName, contentType);
  } catch (e) {
    const fileNameForError =
      attachment && typeof attachment.getName === 'function'
        ? attachment.getName()
        : '不明なファイル';
    handleError(e, `saveAttachment: ${fileNameForError}`);
  }
}

/**
 * 添付ファイルが処理対象かどうかを判定する
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment - 添付ファイル
 * @param {string} finalNormalizedFileName - 正規化されたファイル名
 * @returns {boolean} 処理対象であれば true、そうでなければ false
 */
function isTargetAttachment(attachment, finalNormalizedFileName) {
  const contentType = attachment.getContentType();
  if (contentType === MIME_TYPES.PDF) {
    const fileNameBody = getFileNameWithoutExtension(finalNormalizedFileName);
    return isMenuPdfPattern(fileNameBody);
  } else if (contentType === MIME_TYPES.XLSX || contentType === MIME_TYPES.XLS) {
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
  // 受信したメニューが翌月のものであることを想定し、翌月の年月を取得する
  const nextMonthDate = new Date(receivedDate.getFullYear(), receivedDate.getMonth() + 1, 1);
  const year = nextMonthDate.getFullYear();
  const month = formatToTwoDigits(nextMonthDate.getMonth() + 1);

  let newFileName;
  let targetFolder;

  // PDFの場合はメニューフォルダにリネームして保存
  if (contentType === MIME_TYPES.PDF) {
    newFileName = `${year}.${month}.pdf`;
    targetFolder = folders.menu;
  }
  // Excelの場合はオーダーカードフォルダにGoogleスプレッドシートとして保存
  else if (contentType === MIME_TYPES.XLSX || contentType === MIME_TYPES.XLS) {
    newFileName = `オーダーカード${year}.${month}`;
    targetFolder = folders.orderCard;
  }
  return { newFileName, targetFolder };
}

/**
 * 添付ファイルをGoogle Driveに保存する（重複チェック付き）
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment - 保存する添付ファイル
 * @param {string} newFileName - 保存するファイル名（拡張子なし）
 * @param {GoogleAppsScript.Drive.Folder} targetFolder - 保存先フォルダ
 * @param {string} originalFileName - 元のファイル名（ログ出力用）
 * @param {string} contentType - MIMEタイプ
 */
function saveFileToDrive(attachment, newFileName, targetFolder, originalFileName, contentType) {
  const logger = getContextLogger('saveFileToDrive');

  // Excelファイルの場合はGoogleスプレッドシートに変換して保存
  if (contentType === MIME_TYPES.XLSX || contentType === MIME_TYPES.XLS) {
    saveExcelAsSpreadsheet(attachment, newFileName, targetFolder, originalFileName);
  } else {
    // PDFなどその他のファイルはそのまま保存
    const fullFileName = newFileName;
    const files = targetFolder.getFilesByName(fullFileName);

    if (files.hasNext()) {
      logger.debug(
        `  - ファイル「${fullFileName}」は既に「${targetFolder.getName()}」フォルダに存在するため、スキップしました。`
      );
    } else {
      const blob = attachment.copyBlob();
      blob.setName(fullFileName);
      const file = targetFolder.createFile(blob);
      logger.info(
        `  - ファイル「${file.getName()}」を「${targetFolder.getName()}」フォルダに保存しました。(元ファイル名: ${originalFileName})`
      );
    }
  }
}

/**
 * ExcelファイルをGoogleスプレッドシートに変換して保存する
 *
 * 【重要】この機能を使用するには、GASエディタで「Drive API (v3)」サービスを有効にする必要があります。
 * 手順: GASエディタ → 左メニュー「サービス」→「Drive API」を追加 → バージョン「v3」を選択
 *
 * @param {GoogleAppsScript.Gmail.GmailAttachment} attachment - 保存する添付ファイル
 * @param {string} newFileName - 保存するファイル名（拡張子なし）
 * @param {GoogleAppsScript.Drive.Folder} targetFolder - 保存先フォルダ
 * @param {string} originalFileName - 元のファイル名（ログ出力用）
 */
function saveExcelAsSpreadsheet(attachment, newFileName, targetFolder, originalFileName) {
  const logger = getContextLogger('saveExcelAsSpreadsheet');

  try {
    // 既存のスプレッドシートがあるかチェック
    const existingFiles = targetFolder.getFilesByName(newFileName);
    if (existingFiles.hasNext()) {
      logger.debug(
        `  - スプレッドシート「${newFileName}」は既に「${targetFolder.getName()}」フォルダに存在するため、スキップしました。`
      );
      return;
    }

    // ExcelファイルをGoogleスプレッドシートとして直接作成
    const blob = attachment.copyBlob();
    const resource = {
      name: newFileName,
      mimeType: MimeType.GOOGLE_SHEETS,
      parents: [targetFolder.getId()],
    };

    const createdFile = Drive.Files.create(resource, blob, {
      supportsAllDrives: true,
    });

    // 作成されたスプレッドシートを開いて社名を書き込む
    try {
      const spreadsheet = SpreadsheetApp.openById(createdFile.id);
      const sheet = spreadsheet.getSheets()[0];

      // 情報シートのB9セルから社名を取得
      const companyName = getCompanyNameFromPromptSheet();

      if (companyName) {
        sheet.getRange(ORDER_CARD_INIT_CELL).setValue(companyName);
        logger.debug(`  - ${ORDER_CARD_INIT_CELL}セルに"${companyName}"を書き込みました。`);
      } else {
        logger.warn(
          `  - 社名の取得に失敗しました。${ORDER_CARD_INIT_CELL}セルへの書き込みをスキップします。`
        );
      }
    } catch (e) {
      logger.warn(`  - ${ORDER_CARD_INIT_CELL}セルへの書き込みに失敗しました: ${e.message}`);
    }

    logger.info(
      `  - ファイル「${newFileName}」をGoogleスプレッドシートとして「${targetFolder.getName()}」フォルダに保存しました。(元ファイル名: ${originalFileName})`
    );
  } catch (e) {
    if (e.message && e.message.includes('Drive is not defined')) {
      logger.error(
        'Drive APIが有効になっていません。GASエディタで「サービス」から「Drive API (v3)」を追加してください。'
      );
    }
    handleError(e, 'saveExcelAsSpreadsheet');
  }
}
