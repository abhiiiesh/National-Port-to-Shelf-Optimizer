import { defaultDesignTokens, spacingPx } from './tokens';

export type StatusTone = 'info' | 'warning' | 'success' | 'danger';

export interface ButtonSpec {
  label: string;
  ariaLabel: string;
  kind: 'primary' | 'secondary';
  disabled?: boolean;
}

export interface BadgeSpec {
  label: string;
  tone: StatusTone;
}

export interface RenderedStyle {
  background: string;
  color: string;
  padding: string;
  borderRadius: string;
}

export const buildButtonStyle = (spec: ButtonSpec): RenderedStyle => {
  const isPrimary = spec.kind === 'primary';
  return {
    background: isPrimary ? defaultDesignTokens.color.accent : defaultDesignTokens.color.surface,
    color: isPrimary ? '#FFFFFF' : defaultDesignTokens.color.textPrimary,
    padding: `${spacingPx('sm')} ${spacingPx('lg')}`,
    borderRadius: `${defaultDesignTokens.radius.md}px`,
  };
};

export const buildBadgeStyle = (spec: BadgeSpec): RenderedStyle => {
  const background = {
    info: '#DBEAFE',
    warning: '#FEF3C7',
    success: '#DCFCE7',
    danger: '#FEE2E2',
  }[spec.tone];

  return {
    background,
    color: defaultDesignTokens.color.textPrimary,
    padding: `${spacingPx('xs')} ${spacingPx('sm')}`,
    borderRadius: `${defaultDesignTokens.radius.lg}px`,
  };
};
