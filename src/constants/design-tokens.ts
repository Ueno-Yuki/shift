export const DESIGN_TOKENS = {
  // ライトテーマカラーパレット
  colors: {
    background: {
      primary: '#f8fafc',      // メイン背景（ほぼ白）
      secondary: '#ffffff',     // セカンダリ背景（純白）
      surface: '#f1f5f9',      // サーフェス（薄いグレー）
      elevated: '#fefefe'       // 浮き上がり要素（オフホワイト）
    },
    text: {
      primary: '#1e293b',      // メインテキスト（濃いグレー）
      secondary: '#475569',     // セカンダリテキスト（中グレー）
      muted: '#64748b',        // ミュートテキスト（薄いグレー）
      disabled: '#cbd5e1'      // 無効テキスト（薄いグレー）
    },
    accent: {
      primary: '#3b82f6',      // プライマリアクセント（ブルー）
      secondary: '#06b6d4',     // セカンダリアクセント（シアン）
      success: '#10b981',      // 成功（グリーン）
      warning: '#f59e0b',      // 警告（アンバー）
      error: '#ef4444'         // エラー（レッド）
    },
    shadow: {
      light: '#ffffff',        // ライトシャドウ（白）
      dark: '#e2e8f0'          // ダークシャドウ（薄いグレー）
    },
    border: {
      light: '#f1f5f9',       // 薄いボーダー
      medium: '#e2e8f0',      // 中間ボーダー
      dark: '#cbd5e1'         // 濃いボーダー
    }
  },
  
  // ライトテーマシャドウ設定
  shadows: {
    neumorphic: {
      raised: `
        6px 6px 12px #e2e8f0,
        -6px -6px 12px #ffffff
      `,
      pressed: `
        inset 3px 3px 6px #e2e8f0,
        inset -3px -3px 6px #ffffff
      `,
      floating: `
        8px 8px 16px #e2e8f0,
        -8px -8px 16px #ffffff
      `,
      subtle: `
        3px 3px 6px #e2e8f0,
        -3px -3px 6px #ffffff
      `,
      glow: `
        0 0 20px rgba(59, 130, 246, 0.15),
        6px 6px 12px #e2e8f0,
        -6px -6px 12px #ffffff
      `
    }
  },
  
  // スペーシング
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  
  // ボーダーラジアス
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '50%'
  },
  
  // フォント
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
      xxxl: '32px'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  
  // アニメーション
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms'
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  }
} as const;