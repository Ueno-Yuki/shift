import React from 'react';
import { DESIGN_TOKENS } from '@/constants/design-tokens';
import { NeumorphicProps } from '@/types/design';

const NeumorphicContainer: React.FC<NeumorphicProps> = ({
  children,
  variant = 'raised',
  disabled = false,
  interactive = false,
  className = '',
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    backgroundColor: DESIGN_TOKENS.colors.background.primary,
    borderRadius: DESIGN_TOKENS.borderRadius.md,
    transition: `all ${DESIGN_TOKENS.animation.duration.normal} ${DESIGN_TOKENS.animation.easing.ease}`,
    position: 'relative',
    border: 'none',
    outline: 'none'
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    raised: {
      boxShadow: DESIGN_TOKENS.shadows.neumorphic.raised,
      background: `linear-gradient(145deg, ${DESIGN_TOKENS.colors.background.secondary}, ${DESIGN_TOKENS.colors.background.surface})`
    },
    pressed: {
      boxShadow: DESIGN_TOKENS.shadows.neumorphic.pressed,
      background: `linear-gradient(145deg, ${DESIGN_TOKENS.colors.background.surface}, ${DESIGN_TOKENS.colors.background.secondary})`
    },
    floating: {
      boxShadow: DESIGN_TOKENS.shadows.neumorphic.floating,
      background: `linear-gradient(145deg, ${DESIGN_TOKENS.colors.background.elevated}, ${DESIGN_TOKENS.colors.background.secondary})`
    },
    subtle: {
      boxShadow: DESIGN_TOKENS.shadows.neumorphic.subtle,
      background: `linear-gradient(145deg, ${DESIGN_TOKENS.colors.background.primary}, ${DESIGN_TOKENS.colors.background.surface})`
    }
  };

  const interactiveStyles: React.CSSProperties = interactive ? {
    cursor: 'pointer',
    userSelect: 'none'
  } : {};

  const disabledStyles: React.CSSProperties = disabled ? {
    opacity: 0.6,
    cursor: 'not-allowed',
    pointerEvents: 'none'
  } : {};

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...interactiveStyles,
    ...disabledStyles
  };

  return (
    <div
      style={combinedStyles}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export default NeumorphicContainer;