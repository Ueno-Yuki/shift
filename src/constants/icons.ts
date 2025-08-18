import {
  Calendar,
  Clock,
  ClipboardCheck,
  Droplet,
  Users,
  Settings,
  Bell,
  Download,
  Share2,
  FileText,
  Image,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Edit,
  Check,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Home,
  User,
  Phone,
  Mail,
  Search,
  Filter,
  MoreHorizontal,
  Menu,
  MessageCircle,
  Send,
  Eye,
  EyeOff,
  Star,
  Heart,
  Bookmark,
  Tag,
  MapPin,
  Store,
  Fish,
  Truck,
  Building,
  Sun,
  Moon,
  Zap,
  Shield,
  Wrench
} from 'lucide-react';

export const ICONS = {
  // ナビゲーション
  navigation: {
    Calendar,
    Home,
    ArrowLeft,
    ArrowRight,
    ChevronUp,
    ChevronDown,
    Menu
  },
  
  // アクション
  actions: {
    Plus,
    Minus,
    Edit,
    Check,
    X,
    Download,
    Share2,
    Send,
    Search,
    Filter,
    MoreHorizontal
  },
  
  // ステータス
  status: {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    Eye,
    EyeOff
  },
  
  // ファイル
  files: {
    FileText,
    Image
  },
  
  // ユーザー・コミュニケーション
  user: {
    User,
    Users,
    Phone,
    Mail,
    MessageCircle
  },
  
  // 時間・スケジュール
  time: {
    Clock,
    Calendar
  },
  
  // システム
  system: {
    Settings,
    Bell,
    Wrench
  },
  
  // ポジション（シフト用）
  positions: {
    Droplet,      // 洗い場
    Fish,         // レーン
    Store,        // ホール
    Building,     // 管理
    Truck,        // 配送
    Shield        // セキュリティ
  },
  
  // その他
  misc: {
    ClipboardCheck,
    Star,
    Heart,
    Bookmark,
    Tag,
    MapPin,
    Sun,
    Moon,
    Zap
  }
} as const;

// アイコンタイプ定義
export type IconType = keyof typeof ICONS;
export type IconName<T extends IconType> = keyof typeof ICONS[T];