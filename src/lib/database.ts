// src/lib/database.ts
import fs from 'fs/promises';
import path from 'path';
import { DatabaseSchema, User, Shift, Notice, DailyMessage, SubstituteRequest, EnrichedShift } from '@/types/database';

export class JSONDatabase {
  private data: DatabaseSchema | null = null;
  private lastModified: Date | null = null;
  private readonly dbPath: string;
  private readonly backupDir: string;
  private isLoading = false;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data/database.json');
    this.backupDir = path.join(process.cwd(), 'data/backups');
  }

  // データ読み込み（排他制御付き）
  async load(): Promise<void> {
    if (this.isLoading) {
      // 同時読み込み防止
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.load();
    }

    this.isLoading = true;
    
    try {
      const stats = await fs.stat(this.dbPath);
      
      if (!this.data || !this.lastModified || stats.mtime > this.lastModified) {
        const content = await fs.readFile(this.dbPath, 'utf8');
        this.data = JSON.parse(content);
        this.lastModified = stats.mtime;
        
        // データ整合性チェック
        this.validateDataIntegrity();
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('Database file not found, creating initial data...');
        this.data = this.getInitialData();
        await this.save();
      } else {
        console.error('Database load error:', error);
        throw new Error('Failed to load database');
      }
    } finally {
      this.isLoading = false;
    }
  }

  // データ保存（バックアップ付き）
  async save(): Promise<void> {
    if (!this.data) {
      throw new Error('No data to save');
    }

    try {
      // メタデータ更新
      this.data.metadata.lastUpdatedAt = new Date().toISOString();
      this.data.metadata.version = '1.0.0';

      // バックアップ作成
      await this.createBackup();

      // メインファイル保存
      const tempPath = `${this.dbPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(this.data, null, 2));
      await fs.rename(tempPath, this.dbPath);
      
      this.lastModified = new Date();
      
      console.log('Database saved successfully');
    } catch (error) {
      console.error('Database save error:', error);
      throw new Error('Failed to save database');
    }
  }

  // バックアップ作成
  private async createBackup(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup_${timestamp}.json`);
      
      await fs.writeFile(backupPath, JSON.stringify(this.data, null, 2));
      
      // 古いバックアップ削除（30日以上）
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Backup creation failed:', error);
      // バックアップ失敗は警告レベル（メイン処理は継続）
    }
  }

  // 古いバックアップ削除
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const file of files) {
        if (file.startsWith('backup_') && file.endsWith('.json')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < thirtyDaysAgo) {
            await fs.unlink(filePath);
            console.log(`Deleted old backup: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  // データ整合性チェック
  private validateDataIntegrity(): void {
    if (!this.data) return;

    // 必須フィールドチェック
    const requiredKeys = ['users', 'positions', 'shifts', 'shiftRequests', 'sharedNotices', 'settings', 'metadata'];
    for (const key of requiredKeys) {
      if (!(key in this.data)) {
        console.warn(`Missing required field: ${key}`);
        (this.data as any)[key] = this.getDefaultValueForKey(key);
      }
    }

    // ユーザーデータの修復
    for (const [userId, user] of Object.entries(this.data.users)) {
      if (!user.lineUserId) {
        user.lineUserId = userId;
      }
      if (!user.joinedAt) {
        user.joinedAt = new Date().toISOString();
      }
    }

    console.log('Data integrity check completed');
  }

  // === 基本CRUD操作 ===

  // ユーザー操作
  async getUser(lineUserId: string): Promise<User | null> {
    await this.load();
    return this.data!.users[lineUserId] || null;
  }

  async saveUser(lineUserId: string, userData: Partial<User>): Promise<User> {
    await this.load();
    
    const isNewUser = !this.data!.users[lineUserId];
    
    const existingUser = this.data!.users[lineUserId] || {};
    this.data!.users[lineUserId] = Object.assign(
      {
        lineUserId,
        displayName: '',
        role: 'staff',
        isActive: true,
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      },
      existingUser,
      userData
    );

    if (isNewUser) {
      this.data!.metadata.totalUsers += 1;
    }

    await this.save();
    return this.data!.users[lineUserId];
  }

  async getUsers(): Promise<User[]> {
    await this.load();
    return Object.values(this.data!.users);
  }

  async getActiveUsers(): Promise<User[]> {
    await this.load();
    return Object.values(this.data!.users).filter(user => user.isActive);
  }

  async deactivateUser(lineUserId: string): Promise<void> {
    await this.load();
    
    if (this.data!.users[lineUserId]) {
      this.data!.users[lineUserId].isActive = false;
      this.data!.users[lineUserId].leftAt = new Date().toISOString();
      await this.save();
    }
  }

  // シフト操作
  async getShifts(date: string): Promise<Shift[]> {
    await this.load();
    return this.data!.shifts[date] || [];
  }

  async getMonthlyShifts(month: string): Promise<Shift[]> {
    await this.load();
    
    const monthlyShifts: Shift[] = [];
    
    // 該当月のすべての日付をチェック
    for (const [date, shifts] of Object.entries(this.data!.shifts)) {
      if (date.startsWith(month)) {
        monthlyShifts.push(...shifts);
      }
    }
    
    return monthlyShifts;
  }

  async saveShift(date: string, shiftData: Omit<Shift, 'id' | 'createdAt'>): Promise<Shift> {
    await this.load();
    
    if (!this.data!.shifts[date]) {
      this.data!.shifts[date] = [];
    }

    const shift: Shift = {
      id: this.generateId('shift'),
      ...shiftData,
      createdAt: new Date().toISOString()
    };

    this.data!.shifts[date].push(shift);
    this.data!.metadata.totalShifts += 1;
    
    await this.save();
    return shift;
  }

  async updateShift(date: string, shiftId: string, updateData: Partial<Shift>): Promise<Shift | null> {
    await this.load();
    
    const shifts = this.data!.shifts[date] || [];
    const shiftIndex = shifts.findIndex(s => s.id === shiftId);
    
    if (shiftIndex !== -1) {
      this.data!.shifts[date][shiftIndex] = {
        ...this.data!.shifts[date][shiftIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await this.save();
      return this.data!.shifts[date][shiftIndex];
    }
    
    return null;
  }

  async deleteShift(date: string, shiftId: string): Promise<boolean> {
    await this.load();
    
    const shifts = this.data!.shifts[date] || [];
    const initialLength = shifts.length;
    
    this.data!.shifts[date] = shifts.filter(s => s.id !== shiftId);
    
    if (this.data!.shifts[date].length < initialLength) {
      await this.save();
      return true;
    }
    
    return false;
  }

  // 共有事項操作
  async getActiveNotices(): Promise<Notice[]> {
    await this.load();
    
    const today = new Date().toISOString().split('T')[0];
    
    return this.data!.sharedNotices.filter(notice => 
      notice.isActive && 
      notice.startDate <= today && 
      (!notice.endDate || notice.endDate >= today)
    );
  }

  async saveNotice(noticeData: Omit<Notice, 'id' | 'createdAt'>): Promise<Notice> {
    await this.load();

    const notice: Notice = {
      id: this.generateId('notice'),
      ...noticeData,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.data!.sharedNotices.push(notice);
    await this.save();
    
    return notice;
  }

  // シフト希望操作
  async saveShiftRequest(month: string, lineUserId: string, requestData: any): Promise<any> {
    await this.load();
    
    if (!this.data!.shiftRequests[month]) {
      this.data!.shiftRequests[month] = {};
    }
    
    this.data!.shiftRequests[month][lineUserId] = {
      ...requestData,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };
    
    await this.save();
    return this.data!.shiftRequests[month][lineUserId];
  }

  async getShiftRequests(month: string): Promise<Record<string, any>> {
    await this.load();
    return this.data!.shiftRequests[month] || {};
  }

  // 日次メッセージ操作
  async saveDailyMessage(date: string, messageData: Omit<DailyMessage, 'id' | 'createdAt'>): Promise<DailyMessage> {
    await this.load();
    
    if (!this.data!.dailyMessages[date]) {
      this.data!.dailyMessages[date] = [];
    }

    const message: DailyMessage = {
      id: this.generateId('msg'),
      ...messageData,
      createdAt: new Date().toISOString()
    };

    this.data!.dailyMessages[date].push(message);
    await this.save();
    
    return message;
  }

  async getDailyMessages(date: string): Promise<DailyMessage[]> {
    await this.load();
    return this.data!.dailyMessages[date] || [];
  }

  // 設定操作
  async getSetting(key: string): Promise<any> {
    await this.load();
    return (this.data!.settings as any)[key];
  }

  async setSetting(key: string, value: any): Promise<void> {
    await this.load();
    (this.data!.settings as any)[key] = value;
    await this.save();
  }

  async getSettings(): Promise<any> {
    await this.load();
    return this.data!.settings;
  }

  // ポジション操作
  async getPositions(): Promise<any[]> {
    await this.load();
    return this.data!.positions.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getPositionById(positionId: string): Promise<any> {
    const positions = await this.getPositions();
    return positions.find(p => p.id === positionId);
  }

  // 統計情報
  async getStatistics(): Promise<any> {
    await this.load();
    const today = new Date().toISOString().split('T')[0];
    const activeUsers = Object.values(this.data!.users).filter(u => u.isActive).length;
    const todayShifts = (this.data!.shifts[today] || []).length;
    const activeNotices = this.data!.sharedNotices.filter(n => n.isActive).length;
    
    return {
      totalUsers: activeUsers,
      todayShifts,
      activeNotices,
      lastUpdated: this.data!.metadata.lastUpdatedAt
    };
  }

  // === ユーティリティ ===

  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  private getInitialData(): DatabaseSchema {
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
      substituteRequests: [],
      settings: {
        storeName: "○○○店",
        businessHours: "09:00-22:00",
        adminLineUserId: "",
        shiftDeadlineDay: 25,
        autoBreakEnabled: true,
        breakRules: { "6hours": 45, "8hours": 60 },
        timezone: "Asia/Tokyo"
      },
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalShifts: 0
      }
    };
  }

  private getDefaultValueForKey(key: string): any {
    const defaults: Record<string, any> = {
      users: {},
      positions: [],
      shifts: {},
      shiftRequests: {},
      sharedNotices: [],
      dailyMessages: {},
      settings: {},
      substituteRequests: [],
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalShifts: 0
      }
    };
    
    return defaults[key] || {};
  }

  // 代替依頼操作
  async saveSubstituteRequest(requestData: Partial<SubstituteRequest>): Promise<SubstituteRequest> {
    await this.load();
    
    const request: SubstituteRequest = {
      id: this.generateId('sub'),
      requesterId: '',
      targetDate: '',
      reason: '',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      ...requestData
    };
    
    this.data!.substituteRequests.push(request);
    await this.save();
    return request;
  }

  async updateSubstituteRequest(requestId: string, updateData: Partial<SubstituteRequest>): Promise<SubstituteRequest | null> {
    await this.load();
    
    const requestIndex = this.data!.substituteRequests.findIndex(r => r.id === requestId);
    
    if (requestIndex !== -1) {
      this.data!.substituteRequests[requestIndex] = {
        ...this.data!.substituteRequests[requestIndex],
        ...updateData,
        respondedAt: new Date().toISOString()
      };
      await this.save();
      return this.data!.substituteRequests[requestIndex];
    }
    return null;
  }

  // 高度なクエリ機能
  async findShiftsByUser(lineUserId: string, startDate: string, endDate: string): Promise<Shift[]> {
    await this.load();
    const userShifts: Shift[] = [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayShifts = this.data!.shifts[dateStr] || [];
      
      userShifts.push(...dayShifts.filter(shift => shift.userId === lineUserId));
    }
    
    return userShifts;
  }

  // データのエンリッチ機能
  async enrichShifts(shifts: Shift[]): Promise<EnrichedShift[]> {
    const users = await this.getActiveUsers();
    const positions = await this.getPositions();
    
    return shifts.map(shift => ({
      ...shift,
      user: users.find(u => u.lineUserId === shift.userId),
      position: positions.find(p => p.id === shift.positionId)
    }));
  }
}

// シングルトンインスタンス
export const db = new JSONDatabase();