export interface DesignTokens {
  color: {
    surface: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    danger: string;
    success: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontFamily: string;
    bodySizePx: number;
    headingSizePx: number;
    monoSizePx: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
  };
}

export const defaultDesignTokens: DesignTokens = {
  color: {
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    accent: '#2563EB',
    danger: '#DC2626',
    success: '#16A34A',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    bodySizePx: 14,
    headingSizePx: 20,
    monoSizePx: 13,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};

export const spacingPx = (token: keyof DesignTokens['spacing']): string =>
  `${defaultDesignTokens.spacing[token]}px`;
