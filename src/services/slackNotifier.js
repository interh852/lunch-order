/**
 * Slack通知関連のユーティリティ関数を提供します。
 * Bot Tokenを使用してSlack APIにアクセスします。
 */

/**
 * 指定されたメッセージをSlackの指定されたチャンネルに投稿します。
 * チャンネルIDを引数で上書きすることができます。
 * @param {string} message 投稿するメッセージ
 * @param {string|null} [overrideChannelId=null] 通知先のチャンネルIDまたはユーザーID。指定されない場合はスプレッドシートの設定値を使用します。
 * @returns {Object} Result型のオブジェクト
 */
function sendToSlack(message, overrideChannelId = null) {
  const logger = getContextLogger('sendToSlack');
  const config = getConfig();
  if (!config || !config.slack || !config.slack.botToken) {
    const error = 'SlackのBot Tokenが設定ファイルから取得できませんでした。';
    logger.error(error);
    return Result.failure(error);
  }
  const { botToken, channelId: defaultChannelId } = config.slack;

  // 引数で渡されたIDを優先し、なければデフォルトのIDを使用
  const channelId = overrideChannelId || defaultChannelId;
  if (!channelId) {
    const error = 'SlackのチャンネルIDが設定されていません。';
    logger.error(error);
    return Result.failure(error);
  }

  const payload = {
    channel: channelId,
    text: message,
  };

  const options = {
    method: HTTP_METHODS.POST,
    contentType: HTTP_CONTENT_TYPES.JSON_UTF8,
    headers: {
      'Authorization': `Bearer ${botToken}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // APIエラー時に例外をスローさせず、レスポンスを直接ハンドルする
  };

  try {
    logger.info(`Slackの ${channelId} へメッセージを投稿します。`);
    const response = UrlFetchApp.fetch(API_ENDPOINTS.SLACK_POST_MESSAGE, options);
    const responseBody = JSON.parse(response.getContentText());
    
    if (responseBody.ok) {
      logger.info('Slackへのメッセージ投稿に成功しました。');
      return Result.success({ channelId, timestamp: responseBody.ts }, 'Slackへのメッセージ投稿に成功しました');
    } else {
      const error = `Slackへのメッセージ投稿に失敗しました。エラー: ${responseBody.error}`;
      logger.error(error);
      logger.debug(`レスポンス詳細: ${JSON.stringify(responseBody)}`);
      return Result.failure(error, responseBody);
    }
  } catch (e) {
    logger.error(`Slackへのメッセージ投稿中に予期せぬエラーが発生しました: ${e.message}`);
    return Result.failure(e);
  }
}
