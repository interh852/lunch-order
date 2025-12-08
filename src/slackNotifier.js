/**
 * Slack通知関連のユーティリティ関数を提供します。
 * Bot Tokenを使用してSlack APIにアクセスします。
 */

const SLACK_API_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

/**
 * 指定されたメッセージをSlackの指定されたチャンネルに投稿します。
 * チャンネルIDを引数で上書きすることができます。
 * @param {string} message 投稿するメッセージ
 * @param {string|null} [overrideChannelId=null] 通知先のチャンネルIDまたはユーザーID。指定されない場合はスプレッドシートの設定値を使用します。
 * @returns {boolean} 投稿が成功した場合はtrue、失敗した場合はfalse
 */
function sendToSlack(message, overrideChannelId = null) {
  const config = getSlackConfig();
  if (!config) {
    return false;
  }

  // 引数で渡されたIDを優先する
  const channelId = overrideChannelId || config.channelId;

  const payload = {
    channel: channelId,
    text: message,
  };

  const options = {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'Authorization': `Bearer ${config.botToken}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // APIエラー時に例外をスローさせず、レスポンスを直接ハンドルする
  };

  try {
    console.log(`Slackの ${channelId} へメッセージを投稿します。`);
    const response = UrlFetchApp.fetch(SLACK_API_POST_MESSAGE_URL, options);
    const responseBody = JSON.parse(response.getContentText());
    
    if (responseBody.ok) {
      console.log('Slackへのメッセージ投稿に成功しました。');
      return true;
    } else {
      console.error(`Slackへのメッセージ投稿に失敗しました。エラー: ${responseBody.error}`);
      console.error(`レスポンス詳細: ${JSON.stringify(responseBody)}`);
      return false;
    }
  } catch (e) {
    console.error(`Slackへのメッセージ投稿中に予期せぬエラーが発生しました: ${e.message}`);
    return false;
  }
}

/**
 * スプレッドシートからSlackへの投稿に必要な設定（Bot Token, チャンネルID）を取得します。
 * @returns {{botToken: string, channelId: string}|null} 設定オブジェクト、または取得できなかった場合はnull
 */
function getSlackConfig() {
  const spreadsheetId = getSpreadsheetIdFromProperties();
  if (!spreadsheetId) {
    return null;
  }

  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(PROMPT_SHEET_NAME);
    if (!sheet) {
      console.error(`エラー: スプレッドシートに「${PROMPT_SHEET_NAME}」シートが見つかりません。`);
      return null;
    }

    const botToken = sheet.getRange(SLACK_BOT_TOKEN_CELL).getValue();
    if (!botToken || !botToken.startsWith('xoxb-')) {
      console.error(`エラー: スプレッドシートの${SLACK_BOT_TOKEN_CELL}セルに有効なSlack Bot Tokenが設定されていません。`);
      return null;
    }

    const channelId = sheet.getRange(SLACK_CHANNEL_ID_CELL).getValue();
    if (!channelId) {
      console.error(`エラー: スプレッドシートの${SLACK_CHANNEL_ID_CELL}セルにSlackチャンネルIDが設定されていません。`);
      return null;
    }

    return { botToken, channelId };
  } catch (e) {
    console.error(`スプレッドシートからSlack設定の取得中にエラーが発生しました: ${e.message}`);
    return null;
  }
}

/**
 * スクリプトプロパティからスプレッドシートIDを取得します。
 * @returns {string|null} スプレッドシートID、または未設定の場合はnull
 */
function getSpreadsheetIdFromProperties() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    console.error('エラー: スクリプトプロパティ「SPREADSHEET_ID」が設定されていません。');
    return null;
  }
  return spreadsheetId;
}
