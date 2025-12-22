/**
 * PDFメニューファイルの処理を統合する
 */

/**
 * PDFメニューファイルを処理し、解析してスプレッドシートに書き込む
 */
function processPdfMenuFiles() {
  const logger = getContextLogger('processPdfMenuFiles');
  try {
    const folderInfo = getMenuFolderAndStoreName();
    if (!folderInfo) return;

    const { menuFolder, storeName } = folderInfo;
    const pdfFiles = getSortedPdfFiles(menuFolder);

    let processedCount = 0;
    for (const pdfFile of pdfFiles) {
      if (processSinglePdfFile(pdfFile, storeName)) {
        processedCount++;
      }
    }

    if (processedCount > 0) {
      logger.info(`${processedCount}件の新しいPDFメニューファイルを処理しました。`);
    } else {
      logger.info('処理すべき新しいPDFメニューファイルは見つかりませんでした。');
    }
  } catch (e) {
    handleError(e, 'processPdfMenuFiles');
  }
}

/**
 * スクリプトプロパティからメニューフォルダと店名を取得する
 * @returns {{menuFolder: GoogleAppsScript.Drive.Folder, storeName: string}|null} フォルダと店名のオブジェクト、またはエラーの場合はnull
 */
function getMenuFolderAndStoreName() {
  const logger = getContextLogger('getMenuFolderAndStoreName');
  try {
    const propertyManager = getPropertyManager();
    const menuFolderId = propertyManager.getMenuFolderId();
    const menuFolder = DriveApp.getFolderById(menuFolderId);

    const parents = menuFolder.getParents();
    if (!parents.hasNext()) {
      logger.error(`フォルダID「${menuFolderId}」の親フォルダが見つかりませんでした。`);
      return null;
    }
    const storeName = parents.next().getName();

    return { menuFolder, storeName };
  } catch (e) {
    handleError(e, 'getMenuFolderAndStoreName');
    return null;
  }
}

/**
 * 指定されたフォルダからPDFファイルを取得し、ファイル名でソートして返す
 * @param {GoogleAppsScript.Drive.Folder} folder - PDFファイルが含まれるフォルダ
 * @returns {Array<GoogleAppsScript.Drive.File>} ソートされたPDFファイルの配列
 */
function getSortedPdfFiles(folder) {
  const pdfFilesIterator = folder.getFilesByType(MimeType.PDF);
  const pdfFiles = [];
  while (pdfFilesIterator.hasNext()) {
    pdfFiles.push(pdfFilesIterator.next());
  }

  pdfFiles.sort((a, b) => {
    if (a.getName() < b.getName()) return -1;
    if (a.getName() > b.getName()) return 1;
    return 0;
  });

  return pdfFiles;
}

/**
 * 単一のPDFファイルを処理する
 * @param {GoogleAppsScript.Drive.File} pdfFile - 処理対象のPDFファイル
 * @param {string} storeName - 店名
 * @returns {boolean} 処理が成功した場合はtrue、スキップまたは失敗した場合はfalse
 */
function processSinglePdfFile(pdfFile, storeName) {
  const logger = getContextLogger('processSinglePdfFile');
  const fileName = pdfFile.getName();

  if (hasProcessedSuffix(fileName)) {
    logger.debug(`ファイル「${fileName}」は既に処理済みのためスキップします。`);
    return false;
  }

  logger.info(`ファイル「${fileName}」の処理を開始します。(店名: ${storeName})`);

  const { year: yearFromFile, month: monthFromFile } = _extractYearMonthFromFile(fileName);
  if (!yearFromFile || !monthFromFile) {
    logger.error(`ファイル名「${fileName}」から年月を抽出できませんでした。スキップします。`);
    return false;
  }

  const menuResult = parsePdfMenu(pdfFile);
  if (Result.isFailure(menuResult)) {
    logger.warn(`ファイル「${fileName}」からはメニューデータが抽出されませんでした。`);
    return false;
  }

  const menuDataFromGemini = menuResult.data;
  if (!menuDataFromGemini || menuDataFromGemini.length === 0) {
    logger.warn(`ファイル「${fileName}」からはメニューデータが抽出されませんでした。`);
    return false;
  }

  const updatedMenuData = _transformMenuData(
    menuDataFromGemini,
    yearFromFile,
    monthFromFile,
    storeName
  );

  if (updatedMenuData.length === 0) {
    logger.warn(
      `ファイル「${fileName}」から有効な日付を持つメニューデータが抽出されませんでした。`
    );
    return false;
  }

  updatedMenuData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  logger.debug('スプレッドシートへの書き込みデータ:', JSON.stringify(updatedMenuData, null, 2));
  const writeResult = writeMenuDataToSpreadsheet(updatedMenuData);

  if (Result.isSuccess(writeResult)) {
    _markPdfAsProcessed(pdfFile, fileName);
    return true;
  } else {
    logger.error(`ファイル「${fileName}」のメニューデータ書き込みに失敗しました。`);
    return false;
  }
}

/**
 * ファイル名から年月を抽出するヘルパー関数
 * @param {string} fileName - PDFファイルのファイル名
 * @returns {{year: string, month: string}|null} 抽出された年と月のオブジェクト、または抽出できなかった場合はnull
 */
function _extractYearMonthFromFile(fileName) {
  return extractYearMonthFromFileName(fileName);
}

/**
 * Geminiから抽出したメニューデータをスプレッドシート書き込み用に変換するヘルパー関数
 * @param {Array<Object>} menuDataFromGemini - Geminiから抽出された生データ
 * @param {string} yearFromFile - ファイル名から抽出した年
 * @param {string} monthFromFile - ファイル名から抽出した月
 * @param {string} storeName - 店名
 * @returns {Array<Object>} 変換されたメニューデータの配列
 */
function _transformMenuData(menuDataFromGemini, yearFromFile, monthFromFile, storeName) {
  return menuDataFromGemini
    .map((item) => {
      const day = item.date.split('/')[2] || item.date.split('-')[2];
      return {
        date: `${yearFromFile}-${monthFromFile}-${day.padStart(2, '0')}`,
        storeName: storeName,
        menu: item.menu,
      };
    })
    .filter((item) => item.date.split('-')[2]);
}

/**
 * PDFファイルを処理済みとしてリネームするヘルパー関数
 * @param {GoogleAppsScript.Drive.File} pdfFile - 処理対象のPDFファイル
 * @param {string} originalFileName - 元のファイル名
 */
function _markPdfAsProcessed(pdfFile, originalFileName) {
  const logger = getContextLogger('_markPdfAsProcessed');
  const newFileName = addProcessedSuffix(originalFileName);
  pdfFile.setName(newFileName);
  logger.info(`ファイル「${originalFileName}」を処理し、「${newFileName}」にリネームしました。`);
}
