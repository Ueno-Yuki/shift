# LINE Bot メンション対応 自然言語システム

### 基本的な使用方法

### @メンション形式での操作

#### 一般スタッフ用（自然言語対応）

**シフト関連**
```
@シフトボット 今月のシフト
→ 当月のシフト表を表示

@シフトボット 明日のシフト教えて
→ 明日のシフト詳細を表示

@シフトボット 来月希望です。平日9時から17時、土日休み
→ シフト希望を受け付け、仮シフトに自動反映

@シフトボット 来週の火曜日代わってもらえますか
→ シフト変更希望を受け付け、管理者に通知

@シフトボット シフト表のPDF欲しい
→ PDF・画像ダウンロードリンクを送信
```

**情報確認**
```
@シフトボット お知らせ教えて
→ 現在の共有事項を表示

@シフトボット 私のシフト提出状況は？
→ 自分の提出状況を確認

@シフトボット 使い方教えて
→ 利用可能な機能を説明
```

#### 管理者用（責任者のみ）

**シフト管理**
```
@シフトボット 来月の仮シフト見せて
→ 仮シフト表示（偏り検知結果付き）

@シフトボット 人手不足の詳細教えて
→ 不足箇所の詳細分析を表示

@シフトボット 1月20日、田中さんを洗い場の9時から17時に配置
→ 手動でシフト調整

@シフトボット 来月のシフト確定して
→ 仮シフトを確定し、全員に通知
```

**特別期間設定**
```
@シフトボット お盆休み期間を8月11日から15日まで、ホール2人追加で設定
→ 特別期間を設定

@シフトボット ゴールデンウィークを4月29日から5月5日で設定
→ 連休期間を設定

@シフトボット 設定済みの特別期間教えて
→ 現在の特別期間一覧を表示
```

## 自然言語処理システム（改良版）

### メンション解析エンジン
```javascript
// lib/nlp/mention-parser.js
export class MentionParser {
  constructor() {
    this.botMentions = [
      '@シフトボット',
      '@シフト',
      '@shift',
      '@bot'
    ];
    
    this.intentPatterns = {
      // シフト確認系
      shiftQuery: [
        /(今月|当月|今日|明日|来週|来月)の?シフト/,
        /シフト.*?(確認|教えて|見せて|表示)/,
        /(明日|今日).*?(勤務|シフト)/,
        /(\d+)月(\d+)日.*?シフト/
      ],
      
      // シフト希望提出
      shiftRequest: [
        /(来月|再来月|\d+月).*?希望/,
        /シフト.*?希望/,
        /(平日|土日|週末).*?(時間|勤務)/,
        /(\d{1,2})時.*?(\d{1,2})時/
      ],
      
      // シフト変更希望  
      changeRequest: [
        /(代わって|交代|変更).*?(もらえ|して|お願い)/,
        /(休み|お休み).*?(もらえ|したい|お願い)/,
        /(急用|用事|体調).*?(代わり|交代)/,
        /(明日|来週|今度).*?(代わって|交代)/
      ],
      
      // PDF・画像要求
      pdfRequest: [
        /(PDF|pdf).*?(欲しい|下さい|ください|頂戴)/,
        /(画像|写真).*?(欲しい|下さい|保存)/,
        /シフト表.*?(保存|ダウンロード)/,
        /(印刷|プリント).*?(したい|する)/
      ],
      
      // 共有事項確認
      noticeQuery: [
        /(お知らせ|連絡|共有).*?(教えて|確認|見せて)/,
        /(注意|大事|重要).*?(こと|事項)/,
        /何か.*?(連絡|お知らせ)/
      ],
      
      // ステータス確認
      statusQuery: [
        /(提出|状況).*?(確認|教えて)/,
        /(私|自分).*?(シフト|状況)/,
        /希望.*?(出した|提出)/
      ],
      
      // ヘルプ
      helpRequest: [
        /(使い方|操作|方法).*?(教えて|分からない)/,
        /(何|どう).*?(できる|する)/,
        /(ヘルプ|help)/,
        /(機能|コマンド).*?(一覧|教えて)/
      ],
      
      // 管理者機能
      adminPreview: [
        /(仮|プレビュー).*?シフト.*?(見せて|確認|表示)/,
        /(来月|今月).*?(状況|様子).*?(確認|教えて)/
      ],
      
      adminConflicts: [
        /(人手不足|不足|足りない).*?(詳細|教えて|確認)/,
        /(問題|課題|調整).*?(箇所|場所)/,
        /(偏り|バランス).*?(確認|チェック)/
      ],
      
      adminAssign: [
        /(\d+)月(\d+)日.*?(配置|割り当て|シフト)/,
        /(.*?)を(.*?)に(\d{1,2})時から(\d{1,2})時/,
        /(.*?)さんを(.*?)の(\d{1,2})[:-](\d{2})/
      ],
      
      adminConfirm: [
        /(シフト|来月).*?(確定|決定).*?(して|お願い)/,
        /(確定|決定).*?シフト/
      ],
      
      eventManagement: [
        /(お盆|年末|正月|GW|ゴールデンウィーク).*?(設定|期間)/,
        /(特別|イベント).*?(期間|設定)/,
        /(\d+)月(\d+)日から(\d+)月?(\d+)日.*?(設定|期間)/
      ]
    };
  }
  
  parse(text, user) {
    // @メンションの確認
    const mention = this.extractMention(text);
    if (!mention) {
      return null; // メンションなしは処理しない
    }
    
    // メンション部分を除去してメッセージ本文を取得
    const cleanText = this.removeMention(text);
    
    // 意図を分析
    const intent = this.analyzeIntent(cleanText);
    
    // パラメータを抽出
    const parameters = this.extractParameters(cleanText, intent);
    
    return {
      type: 'mention',
      mention,
      originalText: text,
      cleanText,
      intent,
      parameters,
      confidence: this.calculateConfidence(cleanText, intent),
      user
    };
  }
  
  extractMention(text) {
    for (const mention of this.botMentions) {
      if (text.includes(mention)) {
        return mention;
      }
    }
    return null;
  }
  
  removeMention(text) {
    let cleanText = text;
    for (const mention of this.botMentions) {
      cleanText = cleanText.replace(mention, '').trim();
    }
    return cleanText;
  }
  
  analyzeIntent(text) {
    // 各意図パターンとのマッチング
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return intent;
        }
      }
    }
    
    // マッチしない場合は一般的な会話として処理
    return 'general';
  }
  
  extractParameters(text, intent) {
    const params = {};
    
    switch (intent) {
      case 'shiftQuery':
        params.period = this.extractTimePeriod(text);
        params.date = this.extractSpecificDate(text);
        break;
        
      case 'shiftRequest':
        params.timeRange = this.extractTimeRange(text);
        params.dayPreferences = this.extractDayPreferences(text);
        params.month = this.extractMonth(text);
        break;
        
      case 'changeRequest':
        params.targetDate = this.extractSpecificDate(text);
        params.reason = this.extractReason(text);
        break;
        
      case 'adminAssign':
        params.assignment = this.extractAssignment(text);
        break;
        
      case 'eventManagement':
        params.eventInfo = this.extractEventInfo(text);
        break;
    }
    
    return params;
  }
  
  extractTimePeriod(text) {
    if (text.includes('今月') || text.includes('当月')) return 'current_month';
    if (text.includes('来月')) return 'next_month';
    if (text.includes('今日')) return 'today';
    if (text.includes('明日')) return 'tomorrow';
    if (text.includes('来週')) return 'next_week';
    return null;
  }
  
  extractSpecificDate(text) {
    // 1/20, 1月20日, 来週火曜日 などの日付抽出
    const datePatterns = [
      /(\d+)\/(\d+)/,
      /(\d+)月(\d+)日/,
      /(来週|今週|再来週)(月|火|水|木|金|土|日)/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('月') && pattern.source.includes('日')) {
          const month = match[1].padStart(2, '0');
          const day = match[2].padStart(2, '0');
          return `${new Date().getFullYear()}-${month}-${day}`;
        } else if (pattern.source.includes('/')) {
          const month = match[1].padStart(2, '0');
          const day = match[2].padStart(2, '0');
          return `${new Date().getFullYear()}-${month}-${day}`;
        }
        // 相対日付（来週火曜日など）の処理
        return this.calculateRelativeDate(match[1], match[2]);
      }
    }
    return null;
  }
  
  extractTimeRange(text) {
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
  
  extractDayPreferences(text) {
    const preferences = {};
    
    if (text.includes('平日')) {
      preferences.weekdays = { available: true };
    }
    
    if (text.includes('土日')) {
      const isUnavailable = text.includes('休み') || text.includes('NG');
      preferences.weekends = { available: !isUnavailable };
    }
    
    return preferences;
  }
  
  extractReason(text) {
    if (text.includes('体調') || text.includes('風邪') || text.includes('熱')) {
      return '体調不良';
    }
    if (text.includes('用事') || text.includes('予定')) {
      return '私用';
    }
    if (text.includes('急')) {
      return '急用';
    }
    if (text.includes('家族') || text.includes('家庭')) {
      return '家庭の事情';
    }
    return '未指定';
  }
  
  extractAssignment(text) {
    // "田中さんを洗い場の9時から17時に配置" の解析
    const assignPattern = /(.*?)を(.*?)の(\d{1,2})時から(\d{1,2})時/;
    const match = text.match(assignPattern);
    
    if (match) {
      return {
        name: match[1].replace('さん', ''),
        position: match[2],
        startTime: `${match[3].padStart(2, '0')}:00`,
        endTime: `${match[4].padStart(2, '0')}:00`
      };
    }
    return null;
  }
  
  extractEventInfo(text) {
    // "お盆休み期間を8月11日から15日まで、ホール2人追加で設定"
    const eventPattern = /(.*?)を(\d+)月(\d+)日から(\d+)月?(\d+)日/;
    const match = text.match(eventPattern);
    
    if (match) {
      const startMonth = match[2].padStart(2, '0');
      const startDay = match[3].padStart(2, '0');
      const endMonth = (match[4] || match[2]).padStart(2, '0');
      const endDay = match[5].padStart(2, '0');
      
      return {
        name: match[1],
        startDate: `${new Date().getFullYear()}-${startMonth}-${startDay}`,
        endDate: `${new Date().getFullYear()}-${endMonth}-${endDay}`,
        additionalStaff: this.extractAdditionalStaff(text)
      };
    }
    return null;
  }
  
  extractAdditionalStaff(text) {
    const staffPattern = /(ホール|洗い場|レーン)(\d+)人追加/;
    const match = text.match(staffPattern);
    
    if (match) {
      const position = this.getPositionId(match[1]);
      const count = parseInt(match[2]);
      return { [position]: count };
    }
    
    return { 'pos_04': 1 }; // デフォルトはホール+1人
  }
  
  getPositionId(positionName) {
    const mapping = {
      '洗い場': 'pos_01',
      '1レーン': 'pos_02',
      '2レーン': 'pos_03',
      'ホール': 'pos_04'
    };
    return mapping[positionName] || 'pos_04';
  }
  
  calculateConfidence(text, intent) {
    // テキストと意図の一致度を計算
    const patterns = this.intentPatterns[intent] || [];
    let confidence = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        confidence = Math.max(confidence, 0.8);
      }
    }
    
    return confidence;
  }
  
  calculateRelativeDate(period, dayOfWeek) {
    // "来週火曜日" などの計算
    const today = new Date();
    const dayMapping = {
      '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0
    };
    
    const targetDay = dayMapping[dayOfWeek];
    if (targetDay === undefined) return null;
    
    let targetDate = new Date(today);
    
    if (period === '来週') {
      targetDate.setDate(today.getDate() + 7);
    } else if (period === '再来週') {
      targetDate.setDate(today.getDate() + 14);
    }
    
    // 指定曜日に調整
    const daysDiff = targetDay - targetDate.getDay();
    targetDate.setDate(targetDate.getDate() + daysDiff);
    
    return targetDate.toISOString().split('T')[0];
  }
}
```

## LINE Bot ハンドラー（メンション対応版）

### メッセージ処理の改良
```javascript
// api/webhook.js（改良版）
import { MentionParser } from '../lib/nlp/mention-parser.js';
import { ShiftStateManager, SHIFT_STATUS } from '../lib/shift-status.js';
import { ShortageDetector } from '../lib/shortage-detector.js';
import { EventManager } from '../lib/event-manager.js';
import { db } from '../lib/database.js';

export class LineMentionHandler {
  constructor() {
    this.mentionParser = new MentionParser();
    this.stateManager = new ShiftStateManager(db);
    this.shortageDetector = new ShortageDetector(db);
    this.eventManager = new EventManager(db);
  }
  
  async handleMessage(event) {
    const messageText = event.message.text;
    const lineUserId = event.source.userId;
    
    // ユーザー情報取得
    const user = await db.getUser(lineUserId);
    if (!user) {
      return await this.handleNewUser(event);
    }
    
    // メンション解析
    const parsed = this.mentionParser.parse(messageText, user);
    
    // メンションがない場合は日常会話として処理
    if (!parsed) {
      return await this.handleChatMessage(messageText, user, event);
    }
    
    // ユーザーのアクティブ時刻更新
    await db.saveUser(lineUserId, { lastSeenAt: new Date().toISOString() });
    
    try {
      return await this.handleIntent(parsed, event);
    } catch (error) {
      console.error('Intent handling error:', error);
      return await this.replyToUser(event, 
        '申し訳ございません。エラーが発生しました。\n' +
        'もう一度お試しいただくか、違う言い方で話しかけてください。'
      );
    }
  }
  
  async handleIntent(parsed, event) {
    const { intent, parameters, user } = parsed;
    
    switch (intent) {
      case 'shiftQuery':
        return await this.handleShiftQuery(parameters, user, event);
        
      case 'shiftRequest':
        return await this.handleShiftRequest(parameters, user, event);
        
      case 'changeRequest':
        return await this.handleChangeRequest(parameters, user, event);
        
      case 'pdfRequest':
        return await this.handlePdfRequest(parameters, user, event);
        
      case 'noticeQuery':
        return await this.handleNoticeQuery(parameters, user, event);
        
      case 'statusQuery':
        return await this.handleStatusQuery(parameters, user, event);
        
      case 'helpRequest':
        return await this.handleHelpRequest(user, event);
        
      // 管理者機能
      case 'adminPreview':
        return await this.handleAdminPreview(parameters, user, event);
        
      case 'adminConflicts':
        return await this.handleAdminConflicts(parameters, user, event);
        
      case 'adminAssign':
        return await this.handleAdminAssign(parameters, user, event);
        
      case 'adminConfirm':
        return await this.handleAdminConfirm(parameters, user, event);
        
      case 'eventManagement':
        return await this.handleEventManagement(parameters, user, event);
        
      default:
        return await this.handleGeneral(parsed, event);
    }
  }
  
  // === 意図別ハンドラー ===
  async handleShiftQuery(params, user, event) {
    const period = params.period;
    const specificDate = params.date;
    
    if (specificDate) {
      // 特定日のシフト表示
      return await this.showDailyShift(specificDate, user, event);
    }
    
    switch (period) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        return await this.showDailyShift(today, user, event);
        
      case 'tomorrow':
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return await this.showDailyShift(tomorrow.toISOString().split('T')[0], user, event);
        
      case 'current_month':
        const currentMonth = new Date().toISOString().slice(0, 7);
        return await this.showMonthlyShift(currentMonth, user, event);
        
      case 'next_month':
        const nextMonth = this.getNextMonth();
        return await this.showMonthlyShift(nextMonth, user, event);
        
      default:
        return await this.replyToUser(event, 
          '期間を指定してください。\n\n' +
          '例：\n' +
          '@シフトボット 今月のシフト\n' +
          '@シフトボット 明日のシフト\n' +
          '@シフトボット 1月20日のシフト'
        );
    }
  }
  
  async handleShiftRequest(params, user, event) {
    if (user.role !== 'admin' && user.role !== 'staff') {
      return await this.replyToUser(event, '⚠️ シフト提出権限がありません。');
    }
    
    const shiftData = {
      originalText: event.message.text,
      timePreferences: params.timeRange,
      dayPreferences: params.dayPreferences,
      month: params.month || this.getNextMonth()
    };
    
    // シフト希望を保存
    await db.saveShiftRequest(shiftData.month, user.lineUserId, {
      requestText: shiftData.originalText,
      parsedData: shiftData
    });
    
    // 仮シフトを自動生成・更新
    const previewShifts = await this.stateManager.generatePreviewShift(shiftData.month);
    await this.savePreviewShifts(shiftData.month, previewShifts);
    
    const response = `✅ シフト希望を受け付けました！
    
📅 **対象月**: ${shiftData.month}
⏰ **時間**: ${shiftData.timeRange ? `${shiftData.timeRange.start} - ${shiftData.timeRange.end}` : '未指定'}
📋 **曜日**: ${this.formatDayPreferences(shiftData.dayPreferences)}

🔄 仮シフトに自動反映しました。
責任者による確定をお待ちください。

シフト確認は「@シフトボット 来月のシフト」でできます。`;
    
    return await this.replyToUser(event, response);
  }
  
  async handleChangeRequest(params, user, event) {
    if (user.role !== 'admin' && user.role !== 'staff') {
      return await this.replyToUser(event, '⚠️ シフト変更権限がありません。');
    }
    
    // 代替依頼として保存
    const requestData = {
      requesterId: user.lineUserId,
      targetDate: params.targetDate,
      reason: params.reason,
      originalText: event.message.text,
      status: 'pending'
    };
    
    await db.saveSubstituteRequest(requestData);
    
    // 管理者に通知
    await this.notifyAdmins(`🔄 **シフト変更希望**

👤 **申請者**: ${user.displayName}さん
📅 **対象日**: ${params.targetDate || '未指定'}
💭 **理由**: ${params.reason}
📝 **詳細**: ${event.message.text}

@シフトボット 人手不足の詳細教えて
で確認・調整できます。`);
    
    const response = `🔄 シフト変更希望を受け付けました

📅 **対象日**: ${params.targetDate || '未指定'}
💭 **理由**: ${params.reason}

責任者に通知しました。
確認後、調整いたします。

急ぎの場合は直接責任者にもご連絡ください。`;
    
    return await this.replyToUser(event, response);
  }
  
  async handlePdfRequest(params, user, event) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const baseUrl = process.env.VERCEL_URL || 'https://your-app.vercel.app';
    
    const response = `📄 **シフト表ダウンロード**

📱 **ブラウザで確認**
${baseUrl}/${currentMonth}

📄 **PDFファイル**
${baseUrl}/api/pdf/${currentMonth}?user=${user.lineUserId}

🖼️ **画像ファイル（スマホ保存用）**
${baseUrl}/api/image/${currentMonth}?user=${user.lineUserId}

💡 リンクをタップしてダウンロードしてください。
※ リンクは24時間有効です。`;
    
    return await this.replyToUser(event, response);
  }
  
  async handleHelpRequest(user, event) {
    const isAdmin = user.role === 'admin';
    
    let response = `📚 **使い方ガイド**

💬 **基本的な使い方**
私に @シフトボット を付けて話しかけてください。

🔍 **シフト確認**
・@シフトボット 今月のシフト
・@シフトボット 明日のシフト教えて
・@シフトボット 1月20日のシフト

📝 **シフト希望提出**
・@シフトボット 来月希望です。平日9時から17時
・@シフトボット 土日休み希望です

🔄 **シフト変更**
・@シフトボット 来週火曜日代わってもらえますか
・@シフトボット 急用で明日お休みしたいです

📄 **PDF保存**
・@シフトボット シフト表のPDF欲しい

📢 **お知らせ確認**
・@シフトボット お知らせ教えて

❓ **その他**
普通に質問してもOKです！
「私のシフト提出状況は？」など`;

    if (isAdmin) {
      response += `

👑 **管理者機能**
・@シフトボット 来月の仮シフト見せて
・@シフトボット 人手不足の詳細教えて
・@シフトボット 田中さんを洗い場の9時から17時に配置
・@シフトボット 来月のシフト確定して
・@シフトボット お盆休みを8月11日から15日で設定`;
    }
    
    return await this.replyToUser(event, response);
  }
  
  // === 管理者機能 ===
  async handleAdminPreview(params, user, event) {
    if (user.role !== 'admin') {
      return await this.replyToUser(event, '⚠️ 管理者権限が必要です。');
    }
    
    const targetMonth = this.getNextMonth();
    
    // 仮シフトを生成・分析
    const previewShifts = await this.stateManager.generatePreviewShift(targetMonth);
    const analysis = await this.analyzeMonthlyShortages(targetMonth, previewShifts);
    
    let response = `🔄 **${targetMonth} 仮シフト状況**\n\n`;
    
    if (analysis.criticalDays.length > 0) {
      response += `🚨 **重大な人手不足** (${analysis.criticalDays.length}日)\n`;
      for (const day of analysis.criticalDays.slice(0, 3)) {
        response += `📅 ${day.date}: ${day.shortages.length}箇所不足\n`;
      }
      if (analysis.criticalDays.length > 3) {
        response += `...他${analysis.criticalDays.length - 3}日\n`;
      }
      response += `\n`;
    }
    
    if (analysis.warningDays.length > 0) {
      response += `⚠️ **要注意日** (${analysis.warningDays.length}日)\n`;
      for (const day of analysis.warningDays.slice(0, 2)) {
        response += `📅 ${day.date}: ${day.shortages.length}箇所不足\n`;
      }
      response += `\n`;
    }
    
    response += `📊 **統計情報**
・シフト希望提出: ${analysis.totalSubmissions}/${analysis.totalStaff}名
・人手不足日数: ${analysis.shortDays}/${analysis.totalDays}日
・要調整箇所: ${analysis.totalConflicts}箇所

💡 **次のアクション**
詳細確認: @シフトボット 人手不足の詳細教えて
シフト確定: @シフトボット 来月のシフト確定して`;
    
    return await this.replyToUser(event, response);
  }
  
  async handleAdminConfirm(params, user, event) {
    if (user.role !== 'admin') {
      return await this.replyToUser(event, '⚠️ 管理者権限が必要です。');
    }
    
    const targetMonth = this.getNextMonth();
    
    // 人手不足チェック
    const previewShifts = await this.getPreviewShifts(targetMonth);
    const hasShortages = await this.checkCriticalShortages(targetMonth, previewShifts);
    
    if (hasShortages) {
      return await this.replyToUser(event, 
        `⚠️ **確定前に要確認**\n\n` +
        `重大な人手不足があります。\n` +
        `「@シフトボット 人手不足の詳細教えて」で確認してください。\n\n` +
        `それでも確定する場合は：\n` +
        `「@シフトボット 人手不足承知で確定して」`
      );
    }
    
    // シフト確定処理
    await this.confirmShifts(targetMonth, previewShifts, user);
    
    // 全スタッフに通知
    await this.notifyAllStaff(`🔒 **${targetMonth} シフト確定のお知らせ**

お疲れさまです！
${targetMonth} のシフトが確定しました。

📱 確認方法：
@シフトボット 来月のシフト

📄 PDF保存：
@シフトボット シフト表のPDF欲しい

何かご不明な点があれば、責任者までご連絡ください。`);
    
    return await this.replyToUser(event, 
      `🔒 **${targetMonth} シフト確定完了**\n\n` +
      `全スタッフに通知を送信しました。\n\n` +
      `📊 確定済みシフト確認：\n` +
      `@シフトボット ${targetMonth}のシフト`
    );
  }
  
  // === ユーティリティメソッド ===
  async showDailyShift(date, user, event) {
    const shifts = await db.getShifts(date);
    const userShifts = shifts.filter(s => s.userId === user.lineUserId);
    const positions = await db.getPositions();
    
    if (userShifts.length === 0) {
      return await this.replyToUser(event, 
        `📅 **${date}** ${this.getDayOfWeek(date)}\n\n` +
        `お疲れさまです！\n` +
        `この日はお休みです 😊`
      );
    }
    
    let response = `📅 **${date}** ${this.getDayOfWeek(date)}\n\n`;
    
    for (const shift of userShifts) {
      const position = positions.find(p => p.id === shift.positionId);
      const statusIcon = shift.status === SHIFT_STATUS.CONFIRMED ? '✅' : '🔄';
      const statusText = shift.status === SHIFT_STATUS.CONFIRMED ? '確定' : '仮';
      
      response += `${statusIcon} **${position.emoji} ${position.name}**\n`;
      response += `⏰ ${shift.startTime} - ${shift.endTime}\n`;
      response += `🗓️ ${statusText}シフト\n\n`;
    }
    
    // 休憩時間の表示
    const totalBreak = userShifts.reduce((sum, shift) => sum + (shift.breakMinutes || 0), 0);
    if (totalBreak > 0) {
      response += `☕ 休憩時間: ${totalBreak}分\n\n`;
    }
    
    response += `💡 **変更希望がある場合**\n`;
    response += `@シフトボット ${date}代わってもらえますか`;
    
    return await this.replyToUser(event, response);
  }
  
  async showMonthlyShift(month, user, event) {
    const monthlyShifts = await this.getMonthlyShifts(month);
    const userShifts = this.filterUserShifts(monthlyShifts, user.lineUserId);
    const positions = await db.getPositions();
    
    if (Object.keys(userShifts).length === 0) {
      return await this.replyToUser(event, 
        `📅 **${month}** \n\n` +
        `シフトが登録されていません。\n\n` +
        `💡 シフト希望を提出する場合：\n` +
        `@シフトボット 来月希望です。平日9時から17時`
      );
    }
    
    let response = `📅 **${month} あなたのシフト**\n\n`;
    
    // 週ごとに表示
    const weeks = this.groupByWeek(userShifts);
    for (const [weekStart, weekShifts] of Object.entries(weeks)) {
      response += `📆 **${weekStart}の週**\n`;
      
      for (const [date, shifts] of Object.entries(weekShifts)) {
        const dayOfWeek = this.getDayOfWeek(date);
        
        if (shifts.length === 0) {
          response += `${date}(${dayOfWeek}): お休み\n`;
        } else {
          for (const shift of shifts) {
            const position = positions.find(p => p.id === shift.positionId);
            const statusIcon = shift.status === SHIFT_STATUS.CONFIRMED ? '✅' : '🔄';
            response += `${date}(${dayOfWeek}): ${statusIcon}${position.emoji}${shift.startTime}-${shift.endTime}\n`;
          }
        }
      }
      response += `\n`;
    }
    
    // 統計情報
    const totalShifts = Object.values(userShifts).flat().length;
    const totalHours = this.calculateTotalHours(userShifts);
    
    response += `📊 **月間統計**\n`;
    response += `出勤日数: ${totalShifts}日\n`;
    response += `総勤務時間: ${totalHours}時間\n\n`;
    
    response += `📄 PDF保存: @シフトボット PDF欲しい`;
    
    return await this.replyToUser(event, response);
  }
  
  async handleGeneral(parsed, event) {
    const { cleanText, user } = parsed;
    
    // よくある質問への自動応答
    if (cleanText.includes('ありがとう') || cleanText.includes('助かり')) {
      return await this.replyToUser(event, 
        'どういたしまして！😊\n\n' +
        'また何かあれば @シフトボット を付けて話しかけてください。'
      );
    }
    
    if (cleanText.includes('おはよう') || cleanText.includes('こんにちは') || cleanText.includes('お疲れ')) {
      const greeting = this.getTimeBasedGreeting();
      return await this.replyToUser(event, 
        `${greeting}、${user.displayName}さん！\n\n` +
        '何かお手伝いできることはありますか？\n' +
        '使い方が分からない場合は「@シフトボット 使い方教えて」をお試しください。'
      );
    }
    
    if (cleanText.includes('忙しい') || cleanText.includes('大変')) {
      return await this.replyToUser(event, 
        'お疲れさまです！😊\n\n' +
        'シフトの確認や変更希望など、お手伝いできることがあれば遠慮なくお声かけください。\n\n' +
        '例：@シフトボット 明日のシフト教えて'
      );
    }
    
    // その他の一般的な応答
    return await this.replyToUser(event, 
      '申し訳ございません。\n' +
      'うまく理解できませんでした。\n\n' +
      '💡 **こんな感じで話しかけてください：**\n' +
      '・@シフトボット 今月のシフト\n' +
      '・@シフトボット 来月希望です\n' +
      '・@シフトボット 使い方教えて\n\n' +
      'お困りの場合は責任者にご相談ください。'
    );
  }
  
  // === ヘルパーメソッド ===
  formatDayPreferences(dayPrefs) {
    if (!dayPrefs) return '未指定';
    
    const parts = [];
    if (dayPrefs.weekdays?.available) parts.push('平日OK');
    if (dayPrefs.weekends?.available === false) parts.push('土日休み希望');
    if (dayPrefs.weekends?.available === true) parts.push('土日OK');
    
    return parts.length > 0 ? parts.join(', ') : '未指定';
  }
  
  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 10) return 'おはようございます';
    if (hour < 18) return 'お疲れさまです';
    return 'お疲れさまでした';
  }
  
  getDayOfWeek(date) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[new Date(date).getDay()];
  }
  
  getNextMonth() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().slice(0, 7);
  }
  
  async replyToUser(event, message) {
    // LINE Messaging API での返信実装
    // 実際の実装では @line/bot-sdk を使用
    console.log(`Reply to ${event.source.userId}: ${message}`);
    
    // 実装例（line-sdk使用時）:
    // return lineClient.replyMessage(event.replyToken, {
    //   type: 'text',
    //   text: message
    // });
  }
  
  async notifyAdmins(message) {
    const users = await db.getActiveUsers();
    const adminUsers = users.filter(user => user.role === 'admin');
    
    for (const admin of adminUsers) {
      // プッシュメッセージで管理者に通知
      console.log(`Push message to admin ${admin.lineUserId}: ${message}`);
    }
  }
  
  async notifyAllStaff(message) {
    const users = await db.getActiveUsers();
    
    for (const user of users) {
      console.log(`Push message to ${user.lineUserId}: ${message}`);
    }
  }
}
```

## Webhook エンドポイント実装

### LINE Webhook の完全実装
```javascript
// api/webhook.js（メイン）
import { LineMentionHandler } from '../lib/line-mention-handler.js';
import { Client } from '@line/bot-sdk';
import crypto from 'crypto';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const mentionHandler = new LineMentionHandler();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // LINE署名検証
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  if (!validateSignature(body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const events = req.body.events;

  try {
    await Promise.all(events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        await mentionHandler.handleMessage(event);
      } else if (event.type === 'memberJoined') {
        await handleMemberJoined(event);
      } else if (event.type === 'memberLeft') {
        await handleMemberLeft(event);
      }
    }));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function validateSignature(body, signature) {
  const hash = crypto
    .createHmac('SHA256', process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

async function handleMemberJoined(event) {
  // グループ参加時の自動ユーザー登録
  for (const member of event.joined.members) {
    if (member.type === 'user') {
      try {
        const profile = await client.getProfile(member.userId);
        
        await db.saveUser(member.userId, {
          displayName: profile.displayName,
          role: 'staff',
          isActive: true,
          joinedAt: new Date().toISOString()
        });
        
        // ウェルカムメッセージ
        const welcomeMessage = `${profile.displayName}さん、ようこそ！👋

シフト管理ボットです。
@シフトボット を付けて話しかけてください。

💡 **まずはこちらをお試しください：**
@シフトボット 使い方教えて

何かご不明な点があれば、お気軽にお声かけください！`;

        await client.pushMessage(member.userId, {
          type: 'text',
          text: welcomeMessage
        });
        
      } catch (error) {
        console.error('Failed to handle member joined:', error);
      }
    }
  }
}

async function handleMemberLeft(event) {
  // グループ退出時のユーザー無効化
  for (const member of event.left.members) {
    if (member.type === 'user') {
      const user = await db.getUser(member.userId);
      if (user) {
        await db.saveUser(member.userId, {
          ...user,
          isActive: false,
          leftAt: new Date().toISOString()
        });
      }
    }
  }
}
```

## 使用例とレスポンス例

### 一般スタッフの利用例
```
スタッフ: @シフトボット おはようございます

Bot: おはようございます、田中さん！😊

何かお手伝いできることはありますか？
使い方が分からない場合は「@シフトボット 使い方教えて」をお試しください。

---

スタッフ: @シフトボット 来月希望です。平日は9時から17時で、土日は休み希望

Bot: ✅ シフト希望を受け付けました！

📅 **対象月**: 2025-02
⏰ **時間**: 09:00 - 17:00
📋 **曜日**: 平日OK, 土日休み希望

🔄 仮シフトに自動反映しました。
責任者による確定をお待ちください。

シフト確認は「@シフトボット 来月のシフト」でできます。

---

スタッフ: @シフトボット 来週の火曜日代わってもらえますか

Bot: 🔄 シフト変更希望を受け付けました

📅 **対象日**: 2025-01-21
💭 **理由**: 未指定

責任者に通知しました。
確認後、調整いたします。

急ぎの場合は直接責任者にもご連絡ください。
```

### 管理者の利用例
```
管理者: @シフトボット 来月の仮シフト見せて

Bot: 🔄 **2025-02 仮シフト状況**

🚨 **重大な人手不足** (3日)
📅 2025-02-05: 2箇所不足
📅 2025-02-12: 3箇所不足
📅 2025-02-19: 1箇所不足

⚠️ **要注意日** (5日)
📅 2025-02-08: 1箇所不足
📅 2025-02-15: 1箇所不足

📊 **統計情報**
・シフト希望提出: 8/12名
・人手不足日数: 8/28日
・要調整箇所: 15箇所

💡 **次のアクション**
詳細確認: @シフトボット 人手不足の詳細教えて
シフト確定: @シフトボット 来月のシフト確定して

---

管理者: @シフトボット 2月5日、田中さんを洗い場の9時から17時に配置

Bot: ✅ シフト調整完了

📅 **日付**: 2025-02-05
👤 **スタッフ**: 田中さん
📍 **ポジション**: 洗い場
⏰ **時間**: 09:00 - 17:00

仮シフトを更新しました。
田中さんに変更を通知しました。
```

この改良により、ユーザーは自然な会話でシフト管理ができるようになり、使いやすさが大幅に向上します！## LINE Bot ハンドラー実装

### メッセージハンドラー
```# LINE Bot コマンド体系と API 設計

## LINE Bot コマンド一覧

### 一般スタッフ用コマンド（権限制限）

#### シフト関連
| コマンド | 説明 | 使用例 | レスポンス |
|---------|------|--------|-----------|
| **自然言語** | シフト希望提出 | `来月希望です。平日9-17時、土日休み` | `✅ シフト希望を受け付けました（仮シフトに反映）` |
| **自然言語** | シフト変更希望 | `来週火曜日、代わってもらえませんか？` | `🔄 シフト変更希望を受け付けました` |
| `/shift` | 自分のシフト確認 | `/shift` | 今月のシフト表示（仮・確定区別） |
| `/shift 明日` | 特定日のシフト確認 | `/shift 1/20` | 指定日のシフト表示 |
| `/pdf` | PDF保存リンク | `/pdf` | PDF・画像ダウンロードリンク |

#### 情報確認のみ
| コマンド | 説明 | 使用例 | レスポンス |
|---------|------|--------|-----------|
| `/help` | ヘルプ表示 | `/help` | 使用可能コマンド一覧 |
| `/notice` | 共有事項確認 | `/notice` | アクティブな共有事項表示 |
| `/status` | 提出状況確認 | `/status` | 自分のシフト提出状況 |

### 管理者専用コマンド（責任者権限）

#### シフト管理・確定
| コマンド | 説明 | 使用例 | レスポンス |
|---------|------|--------|-----------|
| `/preview` | 仮シフト確認 | `/preview 来月` | 仮シフト表示（偏り検知付き） |
| `/conflicts` | 偏り・不足検知 | `/conflicts` | 人手不足・偏り箇所の詳細表示 |
| `/assign` | 手動シフト調整 | `/assign 1/20 田中 洗い場 9-17` | シフトを調整しました |
| `/confirm` | シフト確定 | `/confirm 来月` | 🔒 来月のシフトを確定しました |
| `/reopen` | シフト再編集 | `/reopen 来月` | シフトを編集可能に戻しました |

#### 特別期間・イベント設定
| コマンド | 説明 | 使用例 | レスポンス |
|---------|------|--------|-----------|
| `/event add` | 特別期間追加 | `/event add お盆休み 8/11-8/15 +2` | 特別期間を設定しました |
| `/event list` | 特別期間一覧 | `/event list` | 設定済み特別期間表示 |
| `/event remove` | 特別期間削除 | `/event remove お盆休み` | 特別期間を削除しました |
| `/holiday set` | 動的連休設定 | `/holiday set GW 2025/4/29-5/5` | 連休期間を設定しました |

#### システム管理
| コマンド | 説明 | 使用例 | レスポンス |
|---------|------|--------|-----------|
| `/admin setup` | 初期セットアップ | `/admin setup` | 管理者権限設定完了 |
| `/config` | 設定変更 | `/config 営業時間 9:00-22:00` | 設定を更新しました |
| `/users` | ユーザー一覧 | `/users` | アクティブユーザー表示 |
| `/summary` | 提出状況確認 | `/summary` | 全スタッフの提出状況 |

#### 共有事項管理
| コマンド | 説明 | 使用例 | レスポンス |
|---------|------|--------|-----------|
| `/notice add` | 共有事項追加 | `/notice add 機械故障 2レーン食洗機故障中` | 共有事項を追加しました |
| `/notice list` | 共有事項一覧 | `/notice list` | 全共有事項表示 |
| `/notice close` | 共有事項終了 | `/notice close notice_001` | 共有事項を終了しました |

## シフト状態管理システム

### シフト状態の定義
```javascript
// lib/shift-status.js
export const SHIFT_STATUS = {
  DRAFT: 'draft',           // 希望提出段階（仮シフト）
  PREVIEW: 'preview',       // 責任者確認段階（調整可能）
  CONFIRMED: 'confirmed',   // 確定済み（変更には理由が必要）
  LOCKED: 'locked'          // 完全確定（緊急時のみ変更可）
};

export class ShiftStateManager {
  constructor(db) {
    this.db = db;
  }
  
  // 仮シフト生成（希望をそのまま反映）
  async generatePreviewShift(month) {
    const requests = await this.db.getShiftRequests(month);
    const positions = await this.db.getPositions();
    const previewShifts = {};
    
    // 各スタッフの希望をそのまま仮シフトに反映
    for (const [userId, request] of Object.entries(requests)) {
      const parsedData = request.parsedData;
      
      // 月の各日について処理
      const daysInMonth = this.getDaysInMonth(month);
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${day.toString().padStart(2, '0')}`;
        const dayOfWeek = new Date(date).getDay();
        
        if (!previewShifts[date]) previewShifts[date] = [];
        
        // 平日/土日の希望に基づいてシフト生成
        let shouldWork = false;
        let timeRange = null;
        
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && parsedData.weekdays?.available) {
          shouldWork = true;
          timeRange = parsedData.weekdays;
        } else if ((dayOfWeek === 0 || dayOfWeek === 6) && parsedData.weekends?.available) {
          shouldWork = true;
          timeRange = parsedData.weekends;
        }
        
        if (shouldWork && timeRange) {
          // 仮のポジション割当（後で調整）
          const position = positions[0]; // 暫定的に最初のポジション
          
          previewShifts[date].push({
            id: `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            positionId: position.id,
            startTime: timeRange.preferredStart || '09:00',
            endTime: timeRange.preferredEnd || '17:00',
            status: SHIFT_STATUS.DRAFT,
            isPreview: true,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    
    return previewShifts;
  }
  
  getDaysInMonth(month) {
    const [year, monthNum] = month.split('-');
    return new Date(year, monthNum, 0).getDate();
  }
}
```

## 偏り検知・人手不足検知システム

### 不足検知エンジン
```javascript
// lib/shortage-detector.js
export class ShortageDetector {
  constructor(db) {
    this.db = db;
  }
  
  async analyzeShiftCoverage(date, shifts) {
    const analysis = {
      date,
      shortages: [],
      overages: [],
      warnings: [],
      severity: 'normal' // 'normal', 'warning', 'critical'
    };
    
    // 基本必要人数を取得
    const baseRequirements = await this.getBaseRequirements();
    
    // 特別期間・イベントの追加人数を取得
    const eventRequirements = await this.getEventRequirements(date);
    
    // 時間帯別の人員配置を計算
    const hourlyStaffing = this.calculateHourlyStaffing(shifts);
    
    // 必要人数と実際の人数を比較
    for (let hour = 9; hour < 22; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      const actualStaff = hourlyStaffing[timeSlot] || {};
      const requiredStaff = this.calculateRequiredStaff(hour, baseRequirements, eventRequirements);
      
      for (const position of await this.db.getPositions()) {
        const actual = actualStaff[position.id] || 0;
        const required = requiredStaff[position.id] || 1;
        
        if (actual < required) {
          analysis.shortages.push({
            time: timeSlot,
            position: position.name,
            positionId: position.id,
            required,
            actual,
            shortage: required - actual
          });
        } else if (actual > required + 1) {
          analysis.overages.push({
            time: timeSlot,
            position: position.name,
            positionId: position.id,
            required,
            actual,
            overage: actual - required
          });
        }
      }
    }
    
    // 重要度判定
    if (analysis.shortages.length > 0) {
      const criticalShortages = analysis.shortages.filter(s => s.shortage >= 2);
      if (criticalShortages.length > 0) {
        analysis.severity = 'critical';
      } else {
        analysis.severity = 'warning';
      }
    }
    
    return analysis;
  }
  
  calculateHourlyStaffing(shifts) {
    const staffing = {};
    
    for (const shift of shifts) {
      const startHour = parseInt(shift.startTime.split(':')[0]);
      const endHour = parseInt(shift.endTime.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        if (!staffing[timeSlot]) staffing[timeSlot] = {};
        if (!staffing[timeSlot][shift.positionId]) staffing[timeSlot][shift.positionId] = 0;
        
        staffing[timeSlot][shift.positionId]++;
      }
    }
    
    return staffing;
  }
  
  async getBaseRequirements() {
    // 基本的な時間帯別必要人数
    return {
      'pos_01': 1, // 洗い場
      'pos_02': 1, // 1レーン
      'pos_03': 1, // 2レーン
      'pos_04': 2  // ホール
    };
  }
  
  async getEventRequirements(date) {
    const settings = await this.db.getSettings();
    const events = settings.specialEvents || [];
    
    for (const event of events) {
      if (date >= event.startDate && date <= event.endDate) {
        return event.additionalStaff || {};
      }
    }
    
    return {};
  }
  
  calculateRequiredStaff(hour, base, event) {
    const required = { ...base };
    
    // 時間帯別調整（昼時・夕方は多め）
    const timeMultiplier = this.getTimeMultiplier(hour);
    
    for (const [positionId, count] of Object.entries(required)) {
      required[positionId] = Math.ceil(count * timeMultiplier);
      
      // イベント期間の追加人数
      if (event[positionId]) {
        required[positionId] += event[positionId];
      }
    }
    
    return required;
  }
  
  getTimeMultiplier(hour) {
    // 昼時(11-14時)と夕方(17-20時)は1.5倍
    if ((hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 20)) {
      return 1.5;
    }
    return 1.0;
  }
}
```

## 特別期間・イベント管理

### イベント設定システム
```javascript
// lib/event-manager.js
export class EventManager {
  constructor(db) {
    this.db = db;
  }
  
  async addSpecialEvent(name, startDate, endDate, additionalStaff, description) {
    const settings = await this.db.getSettings();
    if (!settings.specialEvents) settings.specialEvents = [];
    
    const event = {
      id: `event_${Date.now()}`,
      name,
      startDate,
      endDate,
      additionalStaff, // { pos_01: 1, pos_04: 2 } 形式
      description,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    settings.specialEvents.push(event);
    await this.db.setSetting('specialEvents', settings.specialEvents);
    
    return event;
  }
  
  async setDynamicHoliday(name, year, dates) {
    const settings = await this.db.getSettings();
    if (!settings.dynamicHolidays) settings.dynamicHolidays = {};
    
    settings.dynamicHolidays[year] = settings.dynamicHolidays[year] || {};
    settings.dynamicHolidays[year][name] = {
      dates,
      additionalStaff: { pos_04: 1 }, // ホール+1人
      createdAt: new Date().toISOString()
    };
    
    await this.db.setSetting('dynamicHolidays', settings.dynamicHolidays);
    
    return settings.dynamicHolidays[year][name];
  }
  
  async getActiveEvents(date) {
    const settings = await this.db.getSettings();
    const events = settings.specialEvents || [];
    
    return events.filter(event => 
      event.isActive &&
      date >= event.startDate &&
      date <= event.endDate
    );
  }
}
```

## 自然言語処理システム（更新版）

### シフト希望の解析
```javascript
// lib/nlp/shift-parser.js
export class ShiftRequestParser {
  constructor() {
    this.patterns = {
      // 時間パターン
      timeRange: /(\d{1,2})(?:時|:)(?:(\d{2})分?)?[〜～\-](\d{1,2})(?:時|:)(?:(\d{2})分?)?/g,
      time24: /(\d{1,2}):(\d{2})/g,
      
      // 曜日パターン
      weekdays: /(平日|月火水木金)/,
      weekends: /(土日|休日|週末)/,
      specificDays: /(月|火|水|木|金|土|日)(?:曜日?)?/g,
      
      // 希望・変更パターン
      preferred: /(希望|お願い|できれば)/,
      unavailable: /(休み|NG|だめ|できない|無理)/,
      changeRequest: /(代わ|変更|交代|急)/,
      
      // 期間パターン
      month: /(来月|再来月|\d+月)/,
      week: /(来週|今週|再来週)/,
      specific: /(\d+)\/(\d+)/
    };
  }
  
  parse(text) {
    // シフト変更希望かどうかを先に判定
    if (this.isChangeRequest(text)) {
      return this.parseChangeRequest(text);
    }
    
    // 通常のシフト希望として解析
    return this.parseShiftRequest(text);
  }
  
  isChangeRequest(text) {
    return this.patterns.changeRequest.test(text) ||
           text.includes('代わって') ||
           text.includes('変更');
  }
  
  parseChangeRequest(text) {
    const result = {
      type: 'change_request',
      originalText: text,
      targetDate: null,
      reason: null,
      confidence: 0.5
    };
    
    // 日付の抽出
    const dateMatch = text.match(this.patterns.specific);
    if (dateMatch) {
      result.targetDate = `${new Date().getFullYear()}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      result.confidence += 0.3;
    }
    
    // 理由の抽出（簡易）
    if (text.includes('体調') || text.includes('風邪') || text.includes('熱')) {
      result.reason = '体調不良';
    } else if (text.includes('用事') || text.includes('予定')) {
      result.reason = '私用';
    } else if (text.includes('急')) {
      result.reason = '急用';
    }
    
    return result;
  }
  
  parseShiftRequest(text) {
    const result = {
      type: 'shift_request',
      originalText: text,
      timePreferences: {},
      dayPreferences: {},
      notes: [],
      confidence: 0
    };
    
    // 時間範囲の抽出
    const timeMatches = [...text.matchAll(this.patterns.timeRange)];
    if (timeMatches.length > 0) {
      const [, startHour, startMin = '00', endHour, endMin = '00'] = timeMatches[0];
      result.timePreferences.preferredStart = `${startHour.padStart(2, '0')}:${startMin}`;
      result.timePreferences.preferredEnd = `${endHour.padStart(2, '0')}:${endMin}`;
      result.confidence += 0.3;
    }
    
    // 曜日の抽出
    if (this.patterns.weekdays.test(text)) {
      result.dayPreferences.weekdays = { 
        available: true,
        ...result.timePreferences 
      };
      result.confidence += 0.2;
    }
    
    if (this.patterns.weekends.test(text)) {
      const isUnavailable = this.patterns.unavailable.test(text);
      result.dayPreferences.weekends = { 
        available: !isUnavailable,
        ...(!isUnavailable ? result.timePreferences : {})
      };
      result.confidence += 0.2;
    }
    
    // 特定の曜日
    const dayMatches = [...text.matchAll(this.patterns.specificDays)];
    if (dayMatches.length > 0) {
      result.dayPreferences.specific = dayMatches.map(match => match[1]);
      result.confidence += 0.1;
    }
    
    // 備考の抽出
    if (this.patterns.preferred.test(text)) {
      result.notes.push('希望として記録');
    }
    
    return result;
  }
}
```