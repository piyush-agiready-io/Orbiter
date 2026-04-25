import { indigo, type ColorMode } from './themes/indigo';

export const activeTheme = indigo;

export function getThemeTokens(mode: ColorMode) {
  const t = activeTheme[mode];
  return {
    '--color-bg-page': t.bg.page,
    '--color-bg-surface': t.bg.surface,
    '--color-bg-elevated': t.bg.elevated,
    '--color-bg-overlay': t.bg.overlay,
    '--color-bg-subtle': t.bg.subtle,
    '--color-bg-muted': t.bg.muted,
    '--color-text-primary': t.text.primary,
    '--color-text-secondary': t.text.secondary,
    '--color-text-muted': t.text.muted,
    '--color-text-disabled': t.text.disabled,
    '--color-text-inverse': t.text.inverse,
    '--color-border-subtle': t.border.subtle,
    '--color-border-default': t.border.default,
    '--color-border-strong': t.border.strong,
    '--color-accent': t.accent.base,
    '--color-accent-hover': t.accent.hover,
    '--color-accent-muted': t.accent.muted,
    '--color-accent-text': t.accent.text,
    '--color-success': t.semantic.success.base,
    '--color-success-muted': t.semantic.success.muted,
    '--color-warning': t.semantic.warning.base,
    '--color-warning-muted': t.semantic.warning.muted,
    '--color-error': t.semantic.error.base,
    '--color-error-muted': t.semantic.error.muted,
    '--color-info': t.semantic.info.base,
    '--color-info-muted': t.semantic.info.muted,
    '--color-p0': t.priority.p0.base,
    '--color-p0-muted': t.priority.p0.muted,
    '--color-p1': t.priority.p1.base,
    '--color-p1-muted': t.priority.p1.muted,
    '--color-p2': t.priority.p2.base,
    '--color-p2-muted': t.priority.p2.muted,
    '--color-p3': t.priority.p3.base,
    '--color-p3-muted': t.priority.p3.muted,
    '--shadow-xs': t.shadow.xs,
    '--shadow-sm': t.shadow.sm,
    '--shadow-md': t.shadow.md,
    '--shadow-lg': t.shadow.lg,
  } as const;
}
