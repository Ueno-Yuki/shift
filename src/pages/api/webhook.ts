import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db } from '../../lib/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // LINE署名検証
    const signature = req.headers['x-line-signature'] as string;
    const body = JSON.stringify(req.body);
    
    if (!validateLineSignature(body, signature)) {
      console.error('Invalid LINE signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Webhook イベント処理
    const events = req.body.events;
    
    await Promise.all(events.map(async (event: any) => {
      try {
        await handleLineEvent(event);
      } catch (error) {
        console.error('Event handling error:', error);
        // 個別イベントエラーはログのみ（全体は継続）
      }
    }));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function validateLineSignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return false;

  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body, 'utf8')
    .digest('base64');
  
  return hash === signature;
}

async function handleLineEvent(event: any) {
  console.log('LINE Event:', JSON.stringify(event, null, 2));

  switch (event.type) {
    case 'message':
      if (event.message.type === 'text') {
        await handleTextMessage(event);
      }
      break;
      
    case 'memberJoined':
      await handleMemberJoined(event);
      break;
      
    case 'memberLeft':
      await handleMemberLeft(event);
      break;
      
    case 'follow':
      await handleFollow(event);
      break;
      
    case 'unfollow':
      await handleUnfollow(event);
      break;
      
    default:
      console.log('Unhandled event type:', event.type);
  }
}

async function handleTextMessage(event: any) {
  const messageText = event.message.text;
  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;

  // @メンションチェック
  const botMentions = ['@シフトボット', '@シフト', '@shift', '@bot'];
  const hasMention = botMentions.some(mention => messageText.includes(mention));

  if (!hasMention) {
    // メンションがない場合は日常会話として日次メッセージに記録
    await saveDailyMessage(lineUserId, messageText);
    return;
  }

  // ユーザー情報取得・作成
  let user = await db.getUser(lineUserId);
  if (!user) {
    user = await createNewUser(lineUserId);
  }

  // 最終アクティブ時刻更新
  await db.saveUser(lineUserId, { lastSeenAt: new Date().toISOString() });

  // 簡易的な意図解析と応答
  const response = await processShiftBotMessage(messageText, user);
  await replyMessage(replyToken, response);
}

async function createNewUser(lineUserId: string) {
  try {
    // LINE APIからプロフィール取得（実際の実装では@line/bot-sdkを使用）
    const user = await db.saveUser(lineUserId, {
      displayName: 'LINE User', // 実際の実装ではLINE APIから取得
      role: 'staff',
      isActive: true
    });
    
    // ウェルカムメッセージ
    await sendWelcomeMessage(lineUserId);
    
    return user;
  } catch (error) {
    console.error('Failed to create user:', error);
    return await db.saveUser(lineUserId, {
      displayName: 'Unknown User',
      role: 'staff',
      isActive: true
    });
  }
}

async function processShiftBotMessage(messageText: string, user: any): Promise<string> {
  // メンション部分を除去
  let cleanText = messageText;
  const botMentions = ['@シフトボット', '@シフト', '@shift', '@bot'];
  botMentions.forEach(mention => {
    cleanText = cleanText.replace(mention, '').trim();
  });

  // 簡易的な意図分析
  if (cleanText.includes('明日') && cleanText.includes('シフト')) {
    return await getTomorrowShift(user);
  }
  
  if (cleanText.includes('今日') && cleanText.includes('シフト')) {
    return await getTodayShift(user);
  }
  
  if (cleanText.includes('来月') && cleanText.includes('希望')) {
    return await handleShiftRequest(cleanText, user);
  }
  
  if (cleanText.includes('PDF') || cleanText.includes('pdf')) {
    return await providePDFLink();
  }
  
  if (cleanText.includes('使い方') || cleanText.includes('ヘルプ')) {
    return getHelpMessage(user);
  }

  // デフォルト応答
  return `申し訳ございません。うまく理解できませんでした。\n\n💡 こんな感じで話しかけてください：\n・明日のシフト教えて\n・来月希望です\n・使い方教えて`;
}

async function getTomorrowShift(user: any): Promise<string> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const shifts = await db.getShifts(tomorrowStr);
  const userShifts = shifts.filter(s => s.userId === user.lineUserId);
  
  if (userShifts.length === 0) {
    return `📅 **明日（${tomorrowStr}）**\n\nお疲れさまです！\n明日はお休みです 😊`;
  }
  
  const positions = await db.getPositions();
  let response = `📅 **明日（${tomorrowStr}）のシフト**\n\n`;
  
  userShifts.forEach(shift => {
    const position = positions.find(p => p.id === shift.positionId);
    response += `${position?.emoji || '📍'} **${position?.name || 'Unknown'}**\n`;
    response += `⏰ ${shift.startTime} - ${shift.endTime}\n`;
    if (shift.breakMinutes > 0) {
      response += `☕ 休憩: ${shift.breakMinutes}分\n`;
    }
    response += `\n`;
  });
  
  response += `💪 お疲れさまです！明日もよろしくお願いします。`;
  return response;
}

async function getTodayShift(user: any): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  
  const shifts = await db.getShifts(today);
  const userShifts = shifts.filter(s => s.userId === user.lineUserId);
  
  if (userShifts.length === 0) {
    return `📅 **今日（${today}）**\n\nお疲れさまです！\n今日はお休みです 😊`;
  }
  
  const positions = await db.getPositions();
  let response = `📅 **今日（${today}）のシフト**\n\n`;
  
  userShifts.forEach(shift => {
    const position = positions.find(p => p.id === shift.positionId);
    response += `${position?.emoji || '📍'} **${position?.name || 'Unknown'}**\n`;
    response += `⏰ ${shift.startTime} - ${shift.endTime}\n`;
    if (shift.breakMinutes > 0) {
      response += `☕ 休憩: ${shift.breakMinutes}分\n`;
    }
    response += `\n`;
  });
  
  response += `💪 今日もお疲れさまです！`;
  return response;
}

async function handleShiftRequest(messageText: string, user: any): Promise<string> {
  if (user.role !== 'admin' && user.role !== 'staff') {
    return '⚠️ シフト提出権限がありません。管理者にお問い合わせください。';
  }

  const nextMonth = getNextMonth();
  
  // 簡易的なシフト希望解析
  const shiftData = {
    originalText: messageText,
    weekdays: parseWeekdayPreference(messageText),
    weekends: parseWeekendPreference(messageText),
    timeRange: parseTimeRange(messageText),
    month: nextMonth
  };

  // シフト希望を保存
  await db.saveShiftRequest(nextMonth, user.lineUserId, {
    requestText: messageText,
    parsedData: shiftData,
    submittedAt: new Date().toISOString(),
    status: 'submitted'
  });

  return `✅ シフト希望を受け付けました！

📅 **対象月**: ${nextMonth}
📝 **内容**: ${messageText}

🔄 仮シフトに反映します。
責任者による確定をお待ちください。

💡 シフト確認: @シフトボット 来月のシフト`;
}

async function providePDFLink(): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-app.vercel.app';
  
  return `📄 **シフト表ダウンロード**

📱 **ブラウザで確認**
${baseUrl}/${today}

📄 **PDFファイル**
${baseUrl}/api/pdf/${today}

🖼️ **画像ファイル（スマホ保存用）**
${baseUrl}/api/image/${today}

💡 リンクをタップしてダウンロードしてください。`;
}

function getHelpMessage(user: any): string {
  const isAdmin = user.role === 'admin';
  
  let response = `📚 **使い方ガイド**

💬 **基本的な使い方**
私に @シフトボット を付けて話しかけてください。

🔍 **シフト確認**
・@シフトボット 今日のシフト
・@シフトボット 明日のシフト教えて

📝 **シフト希望提出**
・@シフトボット 来月希望です。平日9時から17時
・@シフトボット 土日休み希望です

📄 **PDF保存**
・@シフトボット シフト表のPDF欲しい

❓ **その他**
普通に質問してもOKです！`;

  if (isAdmin) {
    response += `

👑 **管理者機能**
・@シフトボット 来月の仮シフト見せて
・@シフトボット 人手不足の詳細教えて
・@シフトボット 来月のシフト確定して`;
  }
  
  return response;
}

async function saveDailyMessage(lineUserId: string, messageText: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const user = await db.getUser(lineUserId);
    
    await db.saveDailyMessage(today, {
      userName: user?.displayName || 'Unknown User',
      message: messageText,
      messageType: 'line_import',
      isPrivate: false,
      userId: lineUserId
    });
  } catch (error) {
    console.error('Failed to save daily message:', error);
  }
}

async function sendWelcomeMessage(lineUserId: string) {
  const welcomeMessage = `👋 **ようこそ！**

シフト管理ボットです。
@シフトボット を付けて話しかけてください。

💡 **まずはこちらをお試しください：**
@シフトボット 使い方教えて

何かご不明な点があれば、お気軽にお声かけください！`;

  // 実際の実装ではLINE Messaging APIを使用してプッシュメッセージを送信
  console.log(`Welcome message for ${lineUserId}:`, welcomeMessage);
}

async function replyMessage(replyToken: string, message: string) {
  // 実際の実装ではLINE Messaging APIを使用
  console.log(`Reply to ${replyToken}:`, message);
  
  // 実装例（line-sdk使用時）:
  // return lineClient.replyMessage(replyToken, {
  //   type: 'text',
  //   text: message
  // });
}

async function handleMemberJoined(event: any) {
  // 新メンバー自動登録
  for (const member of event.joined.members) {
    if (member.type === 'user') {
      try {
        await createNewUser(member.userId);
        console.log(`New user registered: ${member.userId}`);
      } catch (error) {
        console.error('Failed to handle member joined:', error);
      }
    }
  }
}

async function handleMemberLeft(event: any) {
  // メンバー退出処理
  for (const member of event.left.members) {
    if (member.type === 'user') {
      await db.deactivateUser(member.userId);
      console.log(`User deactivated: ${member.userId}`);
    }
  }
}

async function handleFollow(event: any) {
  await createNewUser(event.source.userId);
}

async function handleUnfollow(event: any) {
  await db.deactivateUser(event.source.userId);
}

// ユーティリティ関数
function getNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().slice(0, 7);
}

function parseWeekdayPreference(text: string): any {
  if (text.includes('平日')) {
    return { available: true };
  }
  return null;
}

function parseWeekendPreference(text: string): any {
  if (text.includes('土日')) {
    const isUnavailable = text.includes('休み') || text.includes('NG');
    return { available: !isUnavailable };
  }
  return null;
}

function parseTimeRange(text: string): any {
  const timePattern = /(\d{1,2})時.*?(\d{1,2})時/;
  const match = text.match(timePattern);
  
  if (match) {
    return {
      start: `${match[1].padStart(2, '0')}:00`,
      end: `${match[2].padStart(2, '0')}:00`
    };
  }
  return null;
}