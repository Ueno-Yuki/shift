export interface DatabaseSchema {
  users: Record<string, User>;
  positions: Position[];
  shifts: Record<string, Shift[]>; // date -> Shift[]
  shiftRequests: Record<string, Record<string, ShiftRequest>>; // month -> userId -> ShiftRequest
  sharedNotices: Notice[];
  dailyMessages: Record<string, DailyMessage[]>; // date -> DailyMessage[]
  substituteRequests: SubstituteRequest[];
  settings: SystemSettings;
  metadata: DatabaseMetadata;
}

export interface User {
  lineUserId: string;
  displayName: string;
  realName?: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  joinedAt: string;
  lastSeenAt: string;
  leftAt?: string;
  preferences?: {
    notifications: boolean;
    timezone: string;
  };
}

export interface Position {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
  requiredStaff?: Record<string, number>; // hour -> required count
}

export interface Shift {
  id: string;
  userId: string;
  positionId: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  breakMinutes: number;
  status: 'draft' | 'preview' | 'confirmed' | 'locked';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  notes?: string;
}

export interface ShiftRequest {
  month: string;
  userId: string;
  requestText: string;
  parsedData: ParsedShiftData;
  submittedAt: string;
  status: 'submitted' | 'processed';
  notes?: string;
}

export interface ParsedShiftData {
  weekdays?: {
    available: boolean;
    preferredStart?: string;
    preferredEnd?: string;
  };
  weekends?: {
    available: boolean;
    preferredStart?: string;
    preferredEnd?: string;
  };
  specificDays?: string[];
  unavailableDates?: string[];
  notes?: string[];
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: 'equipment' | 'staff' | 'operation' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyMessage {
  id: string;
  userName: string;
  message: string;
  messageType: 'chat' | 'line_import' | 'admin_memo' | 'system';
  isPrivate: boolean;
  createdAt: string;
  userId?: string;
}

export interface SubstituteRequest {
  id: string;
  shiftId?: string;
  requesterId: string;
  substituteId?: string;
  targetDate: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requestedAt: string;
  respondedAt?: string;
  notes?: string;
}

export interface SystemSettings {
  storeName: string;
  businessHours: string;
  adminLineUserId: string;
  shiftDeadlineDay: number;
  autoBreakEnabled: boolean;
  breakRules: Record<string, number>;
  timezone: string;
  specialEvents?: SpecialEvent[];
  dynamicHolidays?: Record<string, Record<string, any>>;
}

export interface SpecialEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  additionalStaff: Record<string, number>; // positionId -> additional count
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DatabaseMetadata {
  version: string;
  createdAt: string;
  lastUpdatedAt: string;
  totalUsers: number;
  totalShifts: number;
  lastBackupAt?: string;
}

// エンリッチされたシフト（表示用）
export interface EnrichedShift extends Shift {
  user?: User;
  position?: Position;
}

// API レスポンス型
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

// LINE Bot関連の型
export interface MentionParseResult {
  type: 'mention' | 'general';
  mention?: string;
  originalText: string;
  cleanText: string;
  intent: string;
  parameters: any;
  confidence: number;
  user: User;
}

export interface ShiftAnalysis {
  date: string;
  shortages: ShiftShortage[];
  overages: ShiftOverage[];
  warnings: string[];
  severity: 'normal' | 'warning' | 'critical';
}

export interface ShiftShortage {
  time: string;
  position: string;
  positionId: string;
  required: number;
  actual: number;
  shortage: number;
}

export interface ShiftOverage {
  time: string;
  position: string;
  positionId: string;
  required: number;
  actual: number;
  overage: number;
}

// ページネーション用
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 日付範囲用
export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}