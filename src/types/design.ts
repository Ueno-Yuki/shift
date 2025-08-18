import { DESIGN_TOKENS } from '@/constants/design-tokens';

// デザイントークン型
export type ColorToken = keyof typeof DESIGN_TOKENS.colors;
export type ShadowToken = keyof typeof DESIGN_TOKENS.shadows.neumorphic;
export type SpacingToken = keyof typeof DESIGN_TOKENS.spacing;
export type BorderRadiusToken = keyof typeof DESIGN_TOKENS.borderRadius;

// コンポーネント共通プロパティ
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

// ニューモーフィズムコンポーネント型
export interface NeumorphicProps extends BaseComponentProps {
  variant?: 'raised' | 'pressed' | 'floating' | 'subtle';
  disabled?: boolean;
  interactive?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onClick?: () => void;
}

// ボタンコンポーネント型
export interface NeumorphicButtonProps extends NeumorphicProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: React.ComponentType<any>;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// カードコンポーネント型
export interface NeumorphicCardProps extends NeumorphicProps {
  padding?: SpacingToken;
  borderRadius?: BorderRadiusToken;
  hoverable?: boolean;
}

// シフト関連型
export interface ShiftPosition {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  sortOrder: number;
}

export interface ShiftTimeSlot {
  hour: number;
  staffCount: number;
  requiredStaff: number;
  shortage: boolean;
  staff: Array<{
    id: string;
    name: string;
    position: string;
  }>;
}