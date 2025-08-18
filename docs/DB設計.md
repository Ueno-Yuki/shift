## パフォーマンス考慮事項

### メモリ使用量とファイルサイズ予測
```javascript
// 1年間のデータ量予測
const estimateDataSize = {
  users: "20人 × 200bytes = 4KB",
  shifts: "20人 × 365日 × 平均2シフト × 300bytes = 4.4MB",
  shiftRequests: "20人 × 12ヶ月 × 500bytes = 120KB", 
  sharedNotices: "年間100件 × 200bytes = 20KB",
  dailyMessages: "365日 × 平均10メッセージ × 150bytes = 547KB",
  total: "約5-6MB（十分軽量）"
};

// メモリ使用量
const memoryUsage = {
  jsonParsing: "5-10MB",
  objectCaching: "10-20MB", 
  totalPerRequest: "20-30MB（Vercel制限内）"
};
```

### パフォーマンス最適化
```javascript
// lib/database.js に追加

class JSONDatabase {
  constructor() {
    this.data = null;
    this.lastModified = null;
    this.cache = new Map(); // クエリキャッシュ
    this.cacheExpiry = 5 * 60 * 1000; // 5分
  }

  // キャッシュ機能付きクエリ
  async getCachedQuery(key, queryFn) {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }
    
    const data = await queryFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  // 月次シフト取得（キャッシュ付き）
  async getMonthlyShifts(year, month) {
    const cacheKey = `monthly_${year}_${month}`;
    
    return this.getCachedQuery(cacheKey, async () => {
      await this.load();
      const monthlyShifts = {};
      
      // その月の全日付をチェック
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        if (this.data.shifts[date]) {
          monthlyShifts[date] = this.data.shifts[date];
        }
      }
      
      return monthlyShifts;
    });
  }

  // よく使われるクエリのキャッシュ
  async getActiveUsersWithPositions() {
    return this.getCachedQuery('active_users_positions', async () => {
      const users = await this.getActiveUsers();
      const positions = await this.getPositions();
      
      return users.map(user => ({
        ...user,
        availablePositions: positions // 簡略化により全ポジション対応
      }));
    });
  }

  // インデックス風の高速検索
  async findShiftsByUser(lineUserId, startDate, endDate) {
    await this.load();
    const userShifts = [];
    
    // 日付範囲での検索
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayShifts = this.data.shifts[dateStr] || [];
      
      userShifts.push(...dayShifts.filter(shift => shift.userId === lineUserId));
    }
    
    return userShifts;
  }

  // データ圧縮（古いデータのアーカイブ）
  async archiveOldData() {
    await this.load();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoffDate = sixMonthsAgo.toISOString().split('T')[0];
    
    const archiveData = {
      shifts: {},
      dailyMessages: {}
    };
    
    // 古いシフトデータをアーカイブに移動
    for (const date of Object.keys(this.data.shifts)) {
      if (date < cutoffDate) {
        archiveData.shifts[date] = this.data.shifts[date];
        delete this.data.shifts[date];
      }
    }
    
    // 古いメッセージもアーカイブ
    for (const date of Object.keys(this.data.dailyMessages)) {
      if (date < cutoffDate) {
        archiveData.dailyMessages[date] = this.data.dailyMessages[date];
        delete this.data.dailyMessages[date];
      }
    }
    
    // アーカイブファイルを保存
    if (Object.keys(archiveData.shifts).length > 0) {
      const archivePath = path.join(process.cwd(), `data/archive_${cutoffDate}.json`);
      await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2));
    }
    
    await this.save();
    return archiveData;
  }
}
```

## データ移行とスケーリング戦略

### PostgreSQL移行時のマッピング
```javascript
// lib/migration.js - JSONからPostgreSQLへの移行
export async function migrateToPostgreSQL() {
  const jsonData = await db.load();
  
  // users テーブル
  for (const [lineUserId, userData] of Object.entries(jsonData.users)) {
    await postgresDb.query(`
      INSERT INTO users (line_user_id, display_name, real_name, role, is_active, joined_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      userData.lineUserId,
      userData.displayName,
      userData.realName,
      userData.role,
      userData.isActive,
      userData.joinedAt
    ]);
  }
  
  // shifts テーブル
  for (const [date, shifts] of Object.entries(jsonData.shifts)) {
    for (const shift of shifts) {
      await postgresDb.query(`
        INSERT INTO shifts (user_line_id, position_id, shift_date, start_time, end_time, break_minutes, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        shift.userId,
        shift.positionId,
        date,
        shift.startTime,
        shift.endTime,
        shift.breakMinutes,
        shift.status,
        shift.createdAt
      ]);
    }
  }
  
  console.log('Migration completed');
}
```

### スケーリング判断基準
```javascript
// lib/performance-monitor.js
export async function checkPerformanceMetrics() {
  const stats = await db.getStatistics();
  const fileSize = await getFileSize(DB_PATH);
  
  const metrics = {
    fileSize: fileSize / (1024 * 1024), // MB
    totalUsers: stats.totalUsers,
    queryTime: await measureQueryTime(),
    memoryUsage: process.memoryUsage().heapUsed / (1024 * 1024) // MB
  };
  
  // スケーリング判断
  const recommendations = [];
  
  if (metrics.fileSize > 50) {
    recommendations.push('ファイルサイズが大きくなってきました。PostgreSQL移行を検討してください。');
  }
  
  if (metrics.queryTime > 500) {
    recommendations.push('クエリ時間が遅くなっています。データベース移行またはアーカイブを検討してください。');
  }
  
  if (metrics.totalUsers > 100) {
    recommendations.push('ユーザー数が増加しています。有料データベースへの移行を検討してください。');
  }
  
  return { metrics, recommendations };
}

async function measureQueryTime() {
  const start = Date.now();
  await db.getShifts(new Date().toISOString().split('T')[0]);
  return Date.now() - start;
}
```

## 運用時の注意点

### ファイルロック（同時書き込み対策）
```javascript
// lib/file-lock.js
import lockfile from 'proper-lockfile';

export async function withFileLock(operation) {
  const release = await lockfile.lock(DB_PATH, {
    retries: {
      retries: 5,
      factor: 2,
      minTimeout: 100,
      maxTimeout: 1000
    }
  });
  
  try {
    return await operation();
  } finally {
    await release();
  }
}

// 使用例
export async function saveShiftWithLock(date, shiftData) {
  return withFileLock(async () => {
    return await db.saveShift(date, shiftData);
  });
}
```

### エラーハンドリング
```javascript
// lib/error-handler.js
export class DatabaseError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;
  }
}

export async function safeDbOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new DatabaseError('データファイルが見つかりません', 'FILE_NOT_FOUND', error);
    } else if (error.code === 'EACCES') {
      throw new DatabaseError('ファイルアクセス権限がありません', 'PERMISSION_DENIED', error);
    } else if (error instanceof SyntaxError) {
      throw new DatabaseError('データファイルの形式が正しくありません', 'INVALID_JSON', error);
    } else {
      throw new DatabaseError('データベース操作エラー', 'UNKNOWN_ERROR', error);
    }
  }
}
```

## デプロイと運用

### Vercel設定
```json
// vercel.json
{
  "functions": {
    "api/webhook.js": {
      "maxDuration": 10
    },
    "api/daily-notification.js": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/daily-notification",
      "schedule": "0 20 * * *"
    },
    {
      "path": "/api/backup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/archive",
      "schedule": "0 3 1 * *"
    }
  ]
}
```

### 環境変数
```bash
# .env.local
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
BACKUP_WEBHOOK_URL=your_backup_webhook_url
ENVIRONMENT=production
```

この設計により、JSONファイルベースでもスケーラブルで保守性の高いシステムが構築できます。# シフト管理システム データベース設計

## エンティティ関係図（ER図）

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │◄─────►│shift_requests│◄─────►│  positions  │
│（スタッフ）  │       │（シフト希望）│       │（ポジション）│
└─────────────┘       └─────────────┘       └─────────────┘
       │                      │                      │
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    shifts   │       │shared_notices│       │user_positions│
│（確定シフト） │       │（共有事項）    │       │（担当可能）   │
└─────────────┘       └─────────────┘       └─────────────┘
       │                      │
       │                      │
       ▼                      ▼
┌─────────────┐       ┌─────────────┐
│daily_messages│       │  settings   │
│（日次メッセージ）│       │（システム設定）│
└─────────────┘       └─────────────┘
```

## テーブル設計詳細

### 1. users（ユーザー・スタッフ）
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  line_user_id VARCHAR(100) UNIQUE NOT NULL, -- LINE連携用（必須）
  line_display_name VARCHAR(100),   -- LINEの表示名（自動取得）
  name VARCHAR(100),                -- 実名（任意、LINE管理コマンドで設定可能）
  role VARCHAR(20) DEFAULT 'staff', -- 'admin', 'staff'のみ
  is_active BOOLEAN DEFAULT TRUE,   -- LINEグループ参加状況で自動管理
  joined_at TIMESTAMP DEFAULT NOW(), -- LINEグループ参加日時
  last_seen_at TIMESTAMP DEFAULT NOW(), -- 最終アクティブ日時
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_users_active ON users(is_active);

-- LINE Webhook からの自動ユーザー管理
CREATE OR REPLACE FUNCTION manage_user_from_line()
RETURNS TRIGGER AS $
BEGIN
  -- LINEグループ参加時の自動登録
  -- LINEグループ退出時の自動無効化
  RETURN NEW;
END;
$ LANGUAGE plpgsql;
```

## データアクセス関数（JavaScript）

### lib/database.js
```javascript
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/database.json');
const BACKUP_DIR = path.join(process.cwd(), 'data/backups');

class JSONDatabase {
  constructor() {
    this.data = null;
    this.lastModified = null;
  }

  // データ読み込み
  async load() {
    try {
      const stats = await fs.stat(DB_PATH);
      if (!this.data || stats.mtime > this.lastModified) {
        const content = await fs.readFile(DB_PATH, 'utf8');
        this.data = JSON.parse(content);
        this.lastModified = stats.mtime;
      }
    } catch (error) {
      // ファイルが存在しない場合は初期化
      this.data = this.getInitialData();
      await this.save();
    }
  }

  // データ保存
  async save() {
    this.data.metadata.lastUpdatedAt = new Date().toISOString();
    await fs.writeFile(DB_PATH, JSON.stringify(this.data, null, 2));
    this.lastModified = new Date();
    
    // 自動バックアップ
    await this.createBackup();
  }

  // バックアップ作成
  async createBackup() {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}.json`);
      await fs.writeFile(backupPath, JSON.stringify(this.data, null, 2));
      
      // 古いバックアップの削除（30日以上経過）
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  // 古いバックアップ削除
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      for (const file of files) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime < thirtyDaysAgo) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // 初期データ構造
  getInitialData() {
    return {
      users: {},
      positions: [
        { id: "pos_01", name: "洗い場", emoji: "🧽", sortOrder: 1 },
        { id: "pos_02", name: "1レーン", emoji: "🍽️", sortOrder: 2 },
        { id: "pos_03", name: "2レーン", emoji: "🍖", sortOrder: 3 },
        { id: "pos_04", name: "ホール", emoji: "🏃‍♀️", sortOrder: 4 }
      ],
      shifts: {},
      shiftRequests: {},
      sharedNotices: [],
      dailyMessages: {},
      settings: {
        storeName: "○○○店",
        businessHours: "09:00-22:00",
        adminLineUserId: "",
        shiftDeadlineDay: 25,
        autoBreakEnabled: true,
        breakRules: { "6hours": 45, "8hours": 60 },
        timezone: "Asia/Tokyo",
        updatedAt: new Date().toISOString()
      },
      substituteRequests: [],
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalShifts: 0,
        lastBackupAt: null
      }
    };
  }

  // ===== ユーザー管理 =====
  
  async getUser(lineUserId) {
    await this.load();
    return this.data.users[lineUserId] || null;
  }

  async saveUser(lineUserId, userData) {
    await this.load();
    const isNewUser = !this.data.users[lineUserId];
    
    this.data.users[lineUserId] = {
      lineUserId,
      ...this.data.users[lineUserId],
      ...userData,
      lastSeenAt: new Date().toISOString()
    };
    
    if (isNewUser) {
      this.data.metadata.totalUsers += 1;
    }
    
    await this.save();
    return this.data.users[lineUserId];
  }

  async getActiveUsers() {
    await this.load();
    return Object.values(this.data.users).filter(user => user.isActive);
  }

  async setUserRole(lineUserId, role) {
    await this.load();
    if (this.data.users[lineUserId]) {
      this.data.users[lineUserId].role = role;
      await this.save();
      return true;
    }
    return false;
  }

  // ===== シフト管理 =====
  
  async getShifts(date) {
    await this.load();
    return this.data.shifts[date] || [];
  }

  async saveShift(date, shiftData) {
    await this.load();
    if (!this.data.shifts[date]) {
      this.data.shifts[date] = [];
    }
    
    const shiftId = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shift = {
      id: shiftId,
      ...shiftData,
      createdAt: new Date().toISOString()
    };
    
    this.data.shifts[date].push(shift);
    this.data.metadata.totalShifts += 1;
    await this.save();
    return shift;
  }

  async updateShift(date, shiftId, updateData) {
    await this.load();
    const shifts = this.data.shifts[date] || [];
    const shiftIndex = shifts.findIndex(s => s.id === shiftId);
    
    if (shiftIndex !== -1) {
      this.data.shifts[date][shiftIndex] = {
        ...this.data.shifts[date][shiftIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.shifts[date][shiftIndex];
    }
    return null;
  }

  async deleteShift(date, shiftId) {
    await this.load();
    const shifts = this.data.shifts[date] || [];
    this.data.shifts[date] = shifts.filter(s => s.id !== shiftId);
    await this.save();
  }

  // ===== シフト希望管理 =====
  
  async saveShiftRequest(month, lineUserId, requestData) {
    await this.load();
    if (!this.data.shiftRequests[month]) {
      this.data.shiftRequests[month] = {};
    }
    
    this.data.shiftRequests[month][lineUserId] = {
      ...requestData,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };
    
    await this.save();
    return this.data.shiftRequests[month][lineUserId];
  }

  async getShiftRequests(month) {
    await this.load();
    return this.data.shiftRequests[month] || {};
  }

  // ===== 共有事項管理 =====
  
  async getActiveNotices() {
    await this.load();
    const today = new Date().toISOString().split('T')[0];
    return this.data.sharedNotices.filter(notice => 
      notice.isActive && 
      notice.startDate <= today && 
      (!notice.endDate || notice.endDate >= today)
    );
  }

  async saveNotice(noticeData) {
    await this.load();
    const notice = {
      id: `notice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...noticeData,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    this.data.sharedNotices.push(notice);
    await this.save();
    return notice;
  }

  async updateNotice(noticeId, updateData) {
    await this.load();
    const noticeIndex = this.data.sharedNotices.findIndex(n => n.id === noticeId);
    
    if (noticeIndex !== -1) {
      this.data.sharedNotices[noticeIndex] = {
        ...this.data.sharedNotices[noticeIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.sharedNotices[noticeIndex];
    }
    return null;
  }

  // ===== 日次メッセージ管理 =====
  
  async saveDailyMessage(date, messageData) {
    await this.load();
    if (!this.data.dailyMessages[date]) {
      this.data.dailyMessages[date] = [];
    }
    
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...messageData,
      createdAt: new Date().toISOString()
    };
    
    this.data.dailyMessages[date].push(message);
    await this.save();
    return message;
  }

  async getDailyMessages(date) {
    await this.load();
    return this.data.dailyMessages[date] || [];
  }

  // ===== 設定管理 =====
  
  async getSetting(key) {
    await this.load();
    return this.data.settings[key];
  }

  async setSetting(key, value) {
    await this.load();
    this.data.settings[key] = value;
    this.data.settings.updatedAt = new Date().toISOString();
    await this.save();
  }

  async getSettings() {
    await this.load();
    return this.data.settings;
  }

  // ===== 代替依頼管理 =====
  
  async saveSubstituteRequest(requestData) {
    await this.load();
    const request = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...requestData,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    
    this.data.substituteRequests.push(request);
    await this.save();
    return request;
  }

  async updateSubstituteRequest(requestId, updateData) {
    await this.load();
    const requestIndex = this.data.substituteRequests.findIndex(r => r.id === requestId);
    
    if (requestIndex !== -1) {
      this.data.substituteRequests[requestIndex] = {
        ...this.data.substituteRequests[requestIndex],
        ...updateData,
        respondedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.substituteRequests[requestIndex];
    }
    return null;
  }

  // ===== ユーティリティ =====
  
  async getPositions() {
    await this.load();
    return this.data.positions.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPositionById(positionId) {
    const positions = await this.getPositions();
    return positions.find(p => p.id === positionId);
  }

  async getStatistics() {
    await this.load();
    const today = new Date().toISOString().split('T')[0];
    const activeUsers = Object.values(this.data.users).filter(u => u.isActive).length;
    const todayShifts = (this.data.shifts[today] || []).length;
    const activeNotices = this.data.sharedNotices.filter(n => n.isActive).length;
    
    return {
      totalUsers: activeUsers,
      todayShifts,
      activeNotices,
      lastUpdated: this.data.metadata.lastUpdatedAt
    };
  }
}

export const db = new JSONDatabase();
```.cwd(), 'data/database.json');
const BACKUP_DIR = path.join(process.cwd(), 'data/backups');

class JSONDatabase {
  constructor() {
    this.data = null;
    this.lastModified = null;
  }

  // データ読み込み
  async load() {
    try {
      const stats = await fs.stat(DB_PATH);
      if (!this.data || stats.mtime > this.lastModified) {
        const content = await fs.readFile(DB_PATH, 'utf8');
        this.data = JSON.parse(content);
        this.lastModified = stats.mtime;
      }
    } catch (error) {
      // ファイルが存在しない場合は初期化
      this.data = this.getInitialData();
      await this.save();
    }
  }

  // データ保存
  async save() {
    this.data.metadata.lastUpdatedAt = new Date().toISOString();
    await fs.writeFile(DB_PATH, JSON.stringify(this.data, null, 2));
    this.lastModified = new Date();
    
    // 自動バックアップ
    await this.createBackup();
  }

  // バックアップ作成
  async createBackup() {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}.json`);
      await fs.writeFile(backupPath, JSON.stringify(this.data, null, 2));
      
      // 古いバックアップの削除（30日以上経過）
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  // 古いバックアップ削除
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      for (const file of files) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime < thirtyDaysAgo) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  // 初期データ構造
  getInitialData() {
    return {
      users: {},
      positions: [
        { id: "pos_01", name: "洗い場", emoji: "🧽", sortOrder: 1 },
        { id: "pos_02", name: "1レーン", emoji: "🍽️", sortOrder: 2 },
        { id: "pos_03", name: "2レーン", emoji: "🍖", sortOrder: 3 },
        { id: "pos_04", name: "ホール", emoji: "🏃‍♀️", sortOrder: 4 }
      ],
      shifts: {},
      shiftRequests: {},
      sharedNotices: [],
      dailyMessages: {},
      settings: {
        storeName: "○○○店",
        businessHours: "09:00-22:00",
        adminLineUserId: "",
        shiftDeadlineDay: 25,
        autoBreakEnabled: true,
        breakRules: { "6hours": 45, "8hours": 60 },
        timezone: "Asia/Tokyo",
        updatedAt: new Date().toISOString()
      },
      substituteRequests: [],
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalShifts: 0,
        lastBackupAt: null
      }
    };
  }

  // ===== ユーザー管理 =====
  
  async getUser(lineUserId) {
    await this.load();
    return this.data.users[lineUserId] || null;
  }

  async saveUser(lineUserId, userData) {
    await this.load();
    const isNewUser = !this.data.users[lineUserId];
    
    this.data.users[lineUserId] = {
      lineUserId,
      ...this.data.users[lineUserId],
      ...userData,
      lastSeenAt: new Date().toISOString()
    };
    
    if (isNewUser) {
      this.data.metadata.totalUsers += 1;
    }
    
    await this.save();
    return this.data.users[lineUserId];
  }

  async getActiveUsers() {
    await this.load();
    return Object.values(this.data.users).filter(user => user.isActive);
  }

  async setUserRole(lineUserId, role) {
    await this.load();
    if (this.data.users[lineUserId]) {
      this.data.users[lineUserId].role = role;
      await this.save();
      return true;
    }
    return false;
  }

  // ===== シフト管理 =====
  
  async getShifts(date) {
    await this.load();
    return this.data.shifts[date] || [];
  }

  async saveShift(date, shiftData) {
    await this.load();
    if (!this.data.shifts[date]) {
      this.data.shifts[date] = [];
    }
    
    const shiftId = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shift = {
      id: shiftId,
      ...shiftData,
      createdAt: new Date().toISOString()
    };
    
    this.data.shifts[date].push(shift);
    this.data.metadata.totalShifts += 1;
    await this.save();
    return shift;
  }

  async updateShift(date, shiftId, updateData) {
    await this.load();
    const shifts = this.data.shifts[date] || [];
    const shiftIndex = shifts.findIndex(s => s.id === shiftId);
    
    if (shiftIndex !== -1) {
      this.data.shifts[date][shiftIndex] = {
        ...this.data.shifts[date][shiftIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.shifts[date][shiftIndex];
    }
    return null;
  }

  async deleteShift(date, shiftId) {
    await this.load();
    const shifts = this.data.shifts[date] || [];
    this.data.shifts[date] = shifts.filter(s => s.id !== shiftId);
    await this.save();
  }

  // ===== シフト希望管理 =====
  
  async saveShiftRequest(month, lineUserId, requestData) {
    await this.load();
    if (!this.data.shiftRequests[month]) {
      this.data.shiftRequests[month] = {};
    }
    
    this.data.shiftRequests[month][lineUserId] = {
      ...requestData,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };
    
    await this.save();
    return this.data.shiftRequests[month][lineUserId];
  }

  async getShiftRequests(month) {
    await this.load();
    return this.data.shiftRequests[month] || {};
  }

  // ===== 共有事項管理 =====
  
  async getActiveNotices() {
    await this.load();
    const today = new Date().toISOString().split('T')[0];
    return this.data.sharedNotices.filter(notice => 
      notice.isActive && 
      notice.startDate <= today && 
      (!notice.endDate || notice.endDate >= today)
    );
  }

  async saveNotice(noticeData) {
    await this.load();
    const notice = {
      id: `notice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...noticeData,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    this.data.sharedNotices.push(notice);
    await this.save();
    return notice;
  }

  async updateNotice(noticeId, updateData) {
    await this.load();
    const noticeIndex = this.data.sharedNotices.findIndex(n => n.id === noticeId);
    
    if (noticeIndex !== -1) {
      this.data.sharedNotices[noticeIndex] = {
        ...this.data.sharedNotices[noticeIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.sharedNotices[noticeIndex];
    }
    return null;
  }

  // ===== 日次メッセージ管理 =====
  
  async saveDailyMessage(date, messageData) {
    await this.load();
    if (!this.data.dailyMessages[date]) {
      this.data.dailyMessages[date] = [];
    }
    
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...messageData,
      createdAt: new Date().toISOString()
    };
    
    this.data.dailyMessages[date].push(message);
    await this.save();
    return message;
  }

  async getDailyMessages(date) {
    await this.load();
    return this.data.dailyMessages[date] || [];
  }

  // ===== 設定管理 =====
  
  async getSetting(key) {
    await this.load();
    return this.data.settings[key];
  }

  async setSetting(key, value) {
    await this.load();
    this.data.settings[key] = value;
    this.data.settings.updatedAt = new Date().toISOString();
    await this.save();
  }

  async getSettings() {
    await this.load();
    return this.data.settings;
  }

  // ===== 代替依頼管理 =====
  
  async saveSubstituteRequest(requestData) {
    await this.load();
    const request = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...requestData,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    
    this.data.substituteRequests.push(request);
    await this.save();
    return request;
  }

  async updateSubstituteRequest(requestId, updateData) {
    await this.load();
    const requestIndex = this.data.substituteRequests.findIndex(r => r.id === requestId);
    
    if (requestIndex !== -1) {
      this.data.substituteRequests[requestIndex] = {
        ...this.data.substituteRequests[requestIndex],
        ...updateData,
        respondedAt: new Date().toISOString()
      };
      await this.save();
      return this.data.substituteRequests[requestIndex];
    }
    return null;
  }

  // ===== ユーティリティ =====
  
  async getPositions() {
    await this.load();
    return this.data.positions.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPositionById(positionId) {
    const positions = await this.getPositions();
    return positions.find(p => p.id === positionId);
  }

  async getStatistics() {
    await this.load();
    const today = new Date().toISOString().split('T')[0];
    const activeUsers = Object.values(this.data.users).filter(u => u.isActive).length;
    const todayShifts = (this.data.shifts[today] || []).length;
    const activeNotices = this.data.sharedNotices.filter(n => n.isActive).length;
    
    return {
      totalUsers: activeUsers,
      todayShifts,
      activeNotices,
      lastUpdated: this.data.metadata.lastUpdatedAt
    };
  }
}

export const db = new JSONDatabase();
```

### 4. shift_requests（シフト希望）- 簡略化
```sql
CREATE TABLE shift_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  target_month DATE NOT NULL,       -- 対象月（月初日）
  request_text TEXT,                -- LINEで送信された元テキスト
  parsed_data JSONB,                -- 解析済みデータ
  status VARCHAR(20) DEFAULT 'submitted', -- 'submitted', 'processed'
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- request_text 例：「来月希望：平日9-17時、土日休み希望」
-- parsed_data 例：
-- {
--   "weekdays": {"start": "09:00", "end": "17:00"},
--   "weekends": {"available": false},
--   "notes": "土日休み希望"
-- }

-- インデックス
CREATE INDEX idx_shift_requests_user_month ON shift_requests(user_id, target_month);
```

### 5. shifts（確定シフト）
```sql
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  position_id INTEGER REFERENCES positions(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,  -- 休憩時間（分）
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'absent'
  created_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 制約：同じ人が同じ時間に複数のシフトに入れない
  CONSTRAINT no_overlap_shifts EXCLUDE USING gist (
    user_id WITH =,
    daterange(shift_date, shift_date, '[]') WITH &&,
    timerange(start_time, end_time, '[)') WITH &&
  ) WHERE (status != 'cancelled')
);

-- インデックス
CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shifts_user_date ON shifts(user_id, shift_date);
CREATE INDEX idx_shifts_position_date ON shifts(position_id, shift_date);
```

### 6. shared_notices（共有事項）
```sql
CREATE TABLE shared_notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  category VARCHAR(20) NOT NULL,    -- 'equipment', 'staff', 'operation', 'other'
  priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  start_date DATE NOT NULL,
  end_date DATE,                    -- NULL = 無期限
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_shared_notices_active ON shared_notices(is_active, start_date, end_date);
CREATE INDEX idx_shared_notices_category ON shared_notices(category);
CREATE INDEX idx_shared_notices_priority ON shared_notices(priority);
```

### 7. daily_messages（日次メッセージ・チャット）
```sql
CREATE TABLE daily_messages (
  id SERIAL PRIMARY KEY,
  shift_date DATE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(100),           -- LINEユーザー名など（非会員対応）
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'chat', -- 'chat', 'line_import', 'admin_memo', 'system'
  is_private BOOLEAN DEFAULT FALSE, -- 管理者のみ表示
  parent_id INTEGER REFERENCES daily_messages(id), -- 返信機能用
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_daily_messages_date ON daily_messages(shift_date);
CREATE INDEX idx_daily_messages_user ON daily_messages(user_id);
CREATE INDEX idx_daily_messages_type ON daily_messages(message_type);
```

### 8. settings（システム設定）- 最小限に
```sql
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 最小限の設定のみ（LINEコマンドで変更可能）
INSERT INTO settings (key, value, description) VALUES
('store_name', '○○○店', '店舗名'),
('business_hours', '09:00-22:00', '営業時間'),
('admin_line_user_id', '', '管理者のLINE User ID'),
('shift_deadline_day', '25', '月次シフト提出締切日'),
('auto_break_enabled', 'true', '自動休憩時間計算');
```

### 9. shift_changes（シフト変更履歴）
```sql
CREATE TABLE shift_changes (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
  change_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'substitute'
  old_data JSONB,                   -- 変更前データ
  new_data JSONB,                   -- 変更後データ
  changed_by INTEGER REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_shift_changes_shift ON shift_changes(shift_id);
CREATE INDEX idx_shift_changes_date ON shift_changes(created_at);
```

### 10. substitute_requests（代替依頼）
```sql
CREATE TABLE substitute_requests (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
  requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  substitute_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled'
  reason TEXT,
  notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_substitute_requests_shift ON substitute_requests(shift_id);
CREATE INDEX idx_substitute_requests_status ON substitute_requests(status);
```

## データベース制約・ルール

### ビジネスルール制約
```sql
-- 1. シフト時間は営業時間内であること
ALTER TABLE shifts ADD CONSTRAINT check_business_hours 
CHECK (
  start_time >= '09:00' AND 
  end_time <= '22:00' AND 
  start_time < end_time
);

-- 2. 休憩時間は勤務時間の1/3以下
ALTER TABLE shifts ADD CONSTRAINT check_break_time
CHECK (
  break_minutes <= EXTRACT(EPOCH FROM (end_time - start_time))/60/3
);

-- 3. 共有事項の期間は開始日 <= 終了日
ALTER TABLE shared_notices ADD CONSTRAINT check_notice_dates
CHECK (end_date IS NULL OR start_date <= end_date);
```

### パフォーマンス最適化
```sql
-- 複合インデックス（よく使用されるクエリパターン用）
CREATE INDEX idx_shifts_date_position ON shifts(shift_date, position_id);
CREATE INDEX idx_shifts_user_month ON shifts(user_id, DATE_TRUNC('month', shift_date));

-- 部分インデックス（アクティブデータのみ）
CREATE INDEX idx_users_active_staff ON users(id) WHERE is_active = TRUE;
CREATE INDEX idx_shifts_current ON shifts(shift_date, position_id) 
WHERE shift_date >= CURRENT_DATE - INTERVAL '30 days';
```

## データ整合性チェック

### トリガー例
```sql
-- シフト作成時の自動休憩時間計算
CREATE OR REPLACE FUNCTION calculate_break_time()
RETURNS TRIGGER AS $$
DECLARE
  work_hours NUMERIC;
BEGIN
  -- 勤務時間を計算（時間単位）
  work_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/3600;
  
  -- 休憩時間を自動設定
  IF work_hours >= 8 THEN
    NEW.break_minutes := 60;
  ELSIF work_hours >= 6 THEN
    NEW.break_minutes := 45;
  ELSE
    NEW.break_minutes := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_break
  BEFORE INSERT OR UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_break_time();
```

## LINE中心の運用フロー

### 1. ユーザー管理（完全自動）
```javascript
// LINE Webhook - グループ参加時
async function handleGroupJoin(event) {
  const lineUserId = event.source.userId;
  const profile = await lineClient.getProfile(lineUserId);
  
  // 自動ユーザー登録
  await db.query(`
    INSERT INTO users (line_user_id, line_display_name) 
    VALUES ($1, $2)
    ON CONFLICT (line_user_id) 
    DO UPDATE SET 
      is_active = true,
      line_display_name = $2,
      last_seen_at = NOW()
  `, [lineUserId, profile.displayName]);
}

// LINE Webhook - グループ退出時
async function handleGroupLeave(event) {
  const lineUserId = event.source.userId;
  
  // 自動ユーザー無効化
  await db.query(`
    UPDATE users 
    SET is_active = false 
    WHERE line_user_id = $1
  `, [lineUserId]);
}
```

### 2. 管理者設定（LINEコマンド）
```
# 管理者が初回セットアップ時のみ
管理者「/admin setup」
Bot「管理者として登録しました」

# 基本設定もLINEで
管理者「/config 営業時間 9:00-22:00」
Bot「営業時間を更新しました」

管理者「/config 店舗名 ○○○店」
Bot「店舗名を更新しました」
```

### 3. シフト提出（自然言語対応）
```
スタッフ「来月のシフト希望です」
Bot「シフト希望をお聞かせください」

スタッフ「平日は9時から17時まで、土日は休み希望です」
Bot「承知しました！
📅 平日: 09:00-17:00
📅 土日: お休み
この内容で登録しますか？」

スタッフ「はい」
Bot「シフト希望を登録しました✅」
```

### 4. シフト確認（LINE送信）
```
Bot「📅 明日のシフト
🧽 洗い場: 田中さん(9:00-17:00)
🍽️ 1レーン: 佐藤さん(10:00-18:00)
...
📱 詳細: https://shift.example.com/20250115」
```

## 削除・簡略化したテーブル

| 削除したテーブル | 理由 | 代替手段 |
|----------------|------|----------|
| `user_positions` | 管理が複雑 | 全員が全ポジション対応として簡略化 |
| `shift_changes` | 履歴管理複雑 | シンプルなログ出力で代用 |
| `substitute_requests` | フロー複雑 | LINEでのシンプルな依頼・応答 |

## 最小限の管理画面（Web）

**唯一必要な画面：シフト表表示のみ**
- URL: `https://shift.example.com/YYYYMMDD`
- QRコードでアクセス
- 表示専用（編集不可）
- 印刷対応

**管理機能は全てLINE Bot で対応**
- シフト作成: 「/create 明日のシフト」
- 設定変更: 「/config 項目名 値」
- ユーザー確認: 「/users」