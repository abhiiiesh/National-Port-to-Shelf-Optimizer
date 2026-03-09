import type { ButtonSpec } from '../design-system/components';

export interface AccessibilityIssue {
  code: 'MISSING_ARIA_LABEL' | 'EMPTY_VISIBLE_LABEL' | 'LOW_COLOR_CONTRAST';
  message: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const luminance = ([r, g, b]: [number, number, number]): number => {
  const transform = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
};

export const contrastRatio = (foregroundHex: string, backgroundHex: string): number => {
  const l1 = luminance(hexToRgb(foregroundHex));
  const l2 = luminance(hexToRgb(backgroundHex));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
};

export const validateButtonAccessibility = (
  spec: ButtonSpec,
  colors: { foreground: string; background: string }
): AccessibilityIssue[] => {
  const issues: AccessibilityIssue[] = [];

  if (!spec.label.trim()) {
    issues.push({
      code: 'EMPTY_VISIBLE_LABEL',
      message: 'Button must provide a visible non-empty text label.',
    });
  }

  if (!spec.ariaLabel.trim()) {
    issues.push({
      code: 'MISSING_ARIA_LABEL',
      message: 'Button must provide a non-empty aria-label.',
    });
  }

  if (contrastRatio(colors.foreground, colors.background) < 4.5) {
    issues.push({
      code: 'LOW_COLOR_CONTRAST',
      message: 'Button foreground/background contrast should be at least 4.5:1.',
    });
  }

  return issues;
};
