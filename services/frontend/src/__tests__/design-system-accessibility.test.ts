import { validateButtonAccessibility } from '../shared/accessibility/a11y';
import { buildBadgeStyle, buildButtonStyle } from '../shared/design-system/components';
import { defaultDesignTokens, spacingPx } from '../shared/design-system/tokens';
import { formatCurrency, formatDateTime, normalizeLocalizedCopy } from '../shared/i18n/formatters';

describe('design system and accessibility reinforcement', () => {
  it('exposes deterministic design tokens and spacing helpers', () => {
    expect(defaultDesignTokens.spacing.lg).toBe(16);
    expect(spacingPx('xl')).toBe('24px');
  });

  it('builds primary and secondary button styles from shared tokens', () => {
    const primary = buildButtonStyle({
      kind: 'primary',
      label: 'Reserve Slot',
      ariaLabel: 'Reserve transport slot',
    });

    const secondary = buildButtonStyle({
      kind: 'secondary',
      label: 'Cancel',
      ariaLabel: 'Cancel action',
    });

    expect(primary.background).toBe(defaultDesignTokens.color.accent);
    expect(secondary.background).toBe(defaultDesignTokens.color.surface);
  });

  it('builds badge styles for status semantics', () => {
    const style = buildBadgeStyle({ label: 'Delayed', tone: 'warning' });
    expect(style.background).toBe('#FEF3C7');
  });

  it('flags accessibility issues for missing labels and low contrast', () => {
    const issues = validateButtonAccessibility(
      {
        kind: 'primary',
        label: ' ',
        ariaLabel: '',
      },
      {
        foreground: '#777777',
        background: '#888888',
      },
    );

    expect(issues.some((issue) => issue.code === 'EMPTY_VISIBLE_LABEL')).toBe(true);
    expect(issues.some((issue) => issue.code === 'MISSING_ARIA_LABEL')).toBe(true);
    expect(issues.some((issue) => issue.code === 'LOW_COLOR_CONTRAST')).toBe(true);
  });

  it('formats locale-sensitive date/currency and normalizes copy', () => {
    const formattedDate = formatDateTime('2026-03-09T12:00:00Z');
    const formattedCurrency = formatCurrency(12345.67);

    expect(formattedDate.length).toBeGreaterThan(0);
    expect(formattedCurrency).toContain('₹');
    expect(normalizeLocalizedCopy('  Slot confirmed  ')).toBe('Slot confirmed');
  });
});
