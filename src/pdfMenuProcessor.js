/**
 * PDFメニューファイルの処理を統合する
 */

/**
 * PDFメニューファイルを処理し、解析してスプレッドシートに書き込む
 */
function processPdfMenuFiles() {
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
      console.log(`${processedCount}件の新しいPDFメニューファイルを処理しました。`);
    } else {
      console.log('処理すべき新しいPDFメニューファイルは見つかりませんでした。');
    }

  } catch (e) {
    console.error(`PDFメニューファイルの処理中にエラーが発生しました: ${e.message}`);
    console.error(`スタックトレース: ${e.stack}`);
  }
}

/**
 * スクリプトプロパティからメニューフォルダと店名を取得する
 * @returns {{menuFolder: GoogleAppsScript.Drive.Folder, storeName: string}|null} フォルダと店名のオブジェクト、またはエラーの場合はnull
 */
function getMenuFolderAndStoreName() {
  const properties = PropertiesService.getScriptProperties();
  const menuFolderId = properties.getProperty('FOLDER_ID_MENU');

  if (!menuFolderId) {
    console.error('エラー: スクリプトプロパティ「FOLDER_ID_MENU」が設定されていません。');
    return null;
  }

  const menuFolder = DriveApp.getFolderById(menuFolderId);
  const parents = menuFolder.getParents();
  if (!parents.hasNext()) {
    console.error(`フォルダID「${menuFolderId}」の親フォルダが見つかりませんでした。`);
    return null;
  }
  const storeName = parents.next().getName();

  return { menuFolder, storeName };
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
  const fileName = pdfFile.getName();

  if (fileName.includes(PROCESSED_SUFFIX)) {
    console.log(`ファイル「${fileName}」は既に処理済みのためスキップします。`);
    return false;
  }

  console.log(`ファイル「${fileName}」の処理を開始します。(店名: ${storeName})`);

  const match = fileName.match(/(\d{4})\.(\d{2})/);
  if (!match) {
    console.error(`ファイル名「${fileName}」から年月を抽出できませんでした。スキップします。`);
    return false;
  }
  const yearFromFile = match[1];
  const monthFromFile = match[2];

  const menuDataFromGemini = parsePdfMenu(pdfFile);

  if (!menuDataFromGemini || menuDataFromGemini.length === 0) {
    console.log(`ファイル「${fileName}」からはメニューデータが抽出されませんでした。`);
    return false;
  }

  const updatedMenuData = menuDataFromGemini.map(item => {
    const day = item.date.split('/')[2] || item.date.split('-')[2];
    return {
      date: `${yearFromFile}-${monthFromFile}-${day.padStart(2, '0')}`,
      storeName: storeName,
      menu: item.menu
    };
  }).filter(item => item.date.split('-')[2]);

  if (updatedMenuData.length === 0) {
    console.log(`ファイル「${fileName}」から有効な日付を持つメニューデータが抽出されませんでした。`);
    return false;
  }

  updatedMenuData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('スプレッドシートへの書き込みデータ:', JSON.stringify(updatedMenuData, null, 2));
  const writeSuccess = writeMenuDataToSpreadsheet(updatedMenuData);

  if (writeSuccess) {
    const newFileName = `${fileName.replace(/\.pdf$/i, '')}${PROCESSED_SUFFIX}.pdf`;
    pdfFile.setName(newFileName);
    console.log(`ファイル「${fileName}」を処理し、「${newFileName}」にリネームしました。`);
    return true;
  } else {
    console.error(`ファイル「${fileName}」のメニューデータ書き込みに失敗しました。`);
    return false;
  }
}
