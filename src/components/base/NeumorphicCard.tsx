import React from 'react';
import { NeumorphicCardProps } from '@/types/design';

const NeumorphicCard: React.FC<NeumorphicCardProps> = ({
  children,
  padding = 'lg',
  hoverable = false,
  disabled = false,
  className = '',
  ...props
}) => {
  // CSSクラスを生成
  const getCardClasses = () => {
    const classes = [
      'neumorphic-base',
      'neumorphic-raised',
      `neumorphic-${padding}`
    ];
    
    if (hoverable) {
      classes.push('neumorphic-interactive');
    }
    
    return classes.join(' ');
  };

  // パディングスタイル
  const paddingStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '16px' },
    md: { padding: '20px' },
    lg: { padding: '24px' },
    xl: { padding: '32px' }
  };

  return (
    <div
      className={`${getCardClasses()} ${className}`}
      style={{
        ...paddingStyles[padding],
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default NeumorphicCard;