/**
 * 関数の実行結果を統一的に表現するためのユーティリティ
 * 成功・失敗を明確に区別し、データとエラー情報を含むことができます
 */

/**
 * Resultオブジェクトを生成するヘルパークラス
 */
class Result {
  /**
   * 成功結果を生成する
   * @param {*} data 成功時のデータ
   * @param {string} message 成功メッセージ（オプション）
   * @returns {{success: true, data: *, message: string}} 成功結果オブジェクト
   */
  static success(data = null, message = '') {
    return {
      success: true,
      data: data,
      message: message
    };
  }

  /**
   * 失敗結果を生成する
   * @param {string|Error} error エラーメッセージまたはErrorオブジェクト
   * @param {*} data 失敗時でも返したいデータ（オプション）
   * @returns {{success: false, error: string, data: *}} 失敗結果オブジェクト
   */
  static failure(error, data = null) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      data: data
    };
  }

  /**
   * Resultオブジェクトが成功かどうかを判定する
   * @param {Object} result 判定するResultオブジェクト
   * @returns {boolean} 成功の場合true
   */
  static isSuccess(result) {
    return result && result.success === true;
  }

  /**
   * Resultオブジェクトが失敗かどうかを判定する
   * @param {Object} result 判定するResultオブジェクト
   * @returns {boolean} 失敗の場合true
   */
  static isFailure(result) {
    return result && result.success === false;
  }

  /**
   * Resultオブジェクトからデータを取り出す（失敗時はデフォルト値を返す）
   * @param {Object} result Resultオブジェクト
   * @param {*} defaultValue 失敗時のデフォルト値
   * @returns {*} 成功時はresult.data、失敗時はdefaultValue
   */
  static getData(result, defaultValue = null) {
    if (Result.isSuccess(result)) {
      return result.data;
    }
    return defaultValue;
  }

  /**
   * Resultオブジェクトからエラーメッセージを取り出す
   * @param {Object} result Resultオブジェクト
   * @returns {string|null} エラーメッセージ、または成功時はnull
   */
  static getError(result) {
    if (Result.isFailure(result)) {
      return result.error;
    }
    return null;
  }
}

/**
 * 複数のResult結果を結合する
 * 1つでも失敗があれば失敗として扱い、全てのエラーを収集する
 * 
 * @param {Array<Object>} results Resultオブジェクトの配列
 * @returns {{success: boolean, data: Array, errors: Array<string>}} 結合された結果
 */
function combineResults(results) {
  const errors = [];
  const dataList = [];
  
  results.forEach(result => {
    if (Result.isFailure(result)) {
      errors.push(result.error);
    }
    if (result.data !== null && result.data !== undefined) {
      dataList.push(result.data);
    }
  });
  
  return {
    success: errors.length === 0,
    data: dataList,
    errors: errors
  };
}

/**
 * 従来のboolean戻り値をResultオブジェクトに変換する
 * 
 * @param {boolean} booleanResult boolean型の結果
 * @param {*} successData 成功時のデータ
 * @param {string} failureMessage 失敗時のメッセージ
 * @returns {Object} Resultオブジェクト
 */
function booleanToResult(booleanResult, successData = null, failureMessage = '処理に失敗しました') {
  if (booleanResult) {
    return Result.success(successData);
  } else {
    return Result.failure(failureMessage);
  }
}

/**
 * Resultオブジェクトを従来のboolean戻り値に変換する
 * 
 * @param {Object} result Resultオブジェクト
 * @returns {boolean} 成功時true、失敗時false
 */
function resultToBoolean(result) {
  return Result.isSuccess(result);
}

// ========================================
// 使用例
// ========================================

/**
 * 使用例1: データ取得関数
 * 
 * 従来の書き方:
 * function getUser(id) {
 *   if (!id) return null;
 *   return { id: id, name: 'User' };
 * }
 * 
 * Result型を使った書き方:
 * function getUser(id) {
 *   if (!id) {
 *     return Result.failure('IDが指定されていません');
 *   }
 *   const user = { id: id, name: 'User' };
 *   return Result.success(user, 'ユーザーを取得しました');
 * }
 * 
 * 呼び出し側:
 * const result = getUser(123);
 * if (Result.isSuccess(result)) {
 *   console.log('取得成功:', result.data);
 * } else {
 *   console.error('取得失敗:', result.error);
 * }
 */

/**
 * 使用例2: boolean戻り値の関数
 * 
 * 従来の書き方:
 * function saveData(data) {
 *   try {
 *     // 保存処理
 *     return true;
 *   } catch (e) {
 *     console.error(e);
 *     return false;
 *   }
 * }
 * 
 * Result型を使った書き方:
 * function saveData(data) {
 *   try {
 *     // 保存処理
 *     return Result.success(data, 'データを保存しました');
 *   } catch (e) {
 *     return Result.failure(e);
 *   }
 * }
 * 
 * 既存コードとの互換性維持:
 * const result = saveData(data);
 * const success = resultToBoolean(result); // boolean に変換
 */

/**
 * 使用例3: 複数の処理結果を結合
 * 
 * const results = [
 *   processFile('file1.pdf'),
 *   processFile('file2.pdf'),
 *   processFile('file3.pdf')
 * ];
 * 
 * const combined = combineResults(results);
 * if (combined.success) {
 *   console.log(`${combined.data.length}件の処理が成功しました`);
 * } else {
 *   console.error('エラー一覧:', combined.errors);
 * }
 */
