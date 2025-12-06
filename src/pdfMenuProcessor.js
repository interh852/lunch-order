/**
 * PDFメニューファイルの処理を統合する
 */

/**
 * PDFメニューファイルを処理し、解析してスプレッドシートに書き込む
 */
function processPdfMenuFiles() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const menuFolderId = properties.getProperty('FOLDER_ID_MENU');

    if (!menuFolderId) {
      console.error('エラー: スクリプトプロパティ「FOLDER_ID_MENU」が設定されていません。');
      return;
    }

    const menuFolder = DriveApp.getFolderById(menuFolderId);
    
    // 親フォルダ（店名）を取得
    const parents = menuFolder.getParents();
    if (!parents.hasNext()) {
      console.error(`フォルダID「${menuFolderId}」の親フォルダが見つかりませんでした。`);
      return;
    }
    const storeName = parents.next().getName();

    const pdfFilesIterator = menuFolder.getFilesByType(MimeType.PDF);

    // FileIteratorを配列に変換
    const pdfFiles = [];
    while (pdfFilesIterator.hasNext()) {
      pdfFiles.push(pdfFilesIterator.next());
    }

    // ファイル名でソート
    pdfFiles.sort((a, b) => {
      if (a.getName() < b.getName()) return -1;
      if (a.getName() > b.getName()) return 1;
      return 0;
    });

    let processedCount = 0;

    for (const pdfFile of pdfFiles) {
      const fileName = pdfFile.getName();

      // 既に処理済みのファイルはスキップ
      if (fileName.includes('_processed')) {
        console.log(`ファイル「${fileName}」は既に処理済みのためスキップします。`);
        continue;
      }

      console.log(`ファイル「${fileName}」の処理を開始します。(店名: ${storeName})`);

      // ファイル名から年と月を取得 (例: "2025.02.pdf")
      const match = fileName.match(/(\d{4})\.(\d{2})/);
      if (!match) {
        console.error(`ファイル名「${fileName}」から年月を抽出できませんでした。スキップします。`);
        continue;
      }
      const yearFromFile = match[1];
      const monthFromFile = match[2];

      // PDFを解析してメニューデータを抽出
      const menuDataFromGemini = parsePdfMenu(pdfFile);

      if (menuDataFromGemini && menuDataFromGemini.length > 0) {
        
        // menuDataの日付をファイル名の年月で上書きし、店名を追加してフォーマット
        const updatedMenuData = menuDataFromGemini.map(item => {
          const day = item.date.split('/')[2] || item.date.split('-')[2]; // "YYYY/MM/DD" または "YYYY-MM-DD" から "DD" を取得
          return {
            date: `${yearFromFile}-${monthFromFile}-${day.padStart(2, '0')}`,
            storeName: storeName,
            menu: item.menu
          };
        }).filter(item => item.date.split('-')[2]); // 日が正しく取得できたもののみフィルタリング

        if (updatedMenuData.length === 0) {
          console.log(`ファイル「${fileName}」から有効な日付を持つメニューデータが抽出されませんでした。`);
          continue;
        }

        // 日付でソートする
        updatedMenuData.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        console.log('スプレッドシートへの書き込みデータ:', JSON.stringify(updatedMenuData, null, 2));
        // メニューデータをスプレッドシートに書き込み
        const writeSuccess = writeMenuDataToSpreadsheet(updatedMenuData);

        if (writeSuccess) {
          // 処理済みのファイル名を変更
          const newFileName = `${fileName.replace(/\.pdf$/i, '')}_processed.pdf`;
          pdfFile.setName(newFileName);
          console.log(`ファイル「${fileName}」を処理し、「${newFileName}」にリネームしました。`);
          processedCount++;
        } else {
          console.error(`ファイル「${fileName}」のメニューデータ書き込みに失敗しました。`);
        }
      } else {
        console.log(`ファイル「${fileName}」からはメニューデータが抽出されませんでした。`);
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
