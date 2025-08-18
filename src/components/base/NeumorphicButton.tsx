import React, { useState } from 'react';
import { NeumorphicButtonProps } from '@/types/design';

const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  children,
  size = 'md',
  color = 'primary',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // CSSクラスを生成
  const getButtonClasses = () => {
    const classes = [
      'neumorphic-base',
      'neumorphic-interactive',
      `neumorphic-${size}`,
      `neumorphic-${color}`
    ];

    if (loading) {
      classes.push('neumorphic-disabled');
    }

    if (disabled) {
      classes.push('neumorphic-disabled');
    }

    if (isPressed) {
      classes.push('neumorphic-pressed');
    } else {
      classes.push('neumorphic-raised');
    }

    return classes.join(' ');
  };

  const handleMouseDown = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  // サイズごとのスタイル
  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '14px', minHeight: '36px' },
    md: { padding: '12px 24px', fontSize: '16px', minHeight: '44px' },
    lg: { padding: '16px 32px', fontSize: '18px', minHeight: '52px' }
  };

  return (
    <button
      type={type}
      className={`${getButtonClasses()} ${className}`}
      style={sizeStyles[size]}
      disabled={disabled || loading}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <span>読み込み中...</span>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={16} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={16} />}
        </>
      )}
    </button>
  );
};

export default NeumorphicButton;