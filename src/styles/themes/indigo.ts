export const indigo = {
  name: 'indigo',
  light: {
    bg: {
      page: '#FAFAFA',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.45)',
      subtle: '#F4F4F5',
      muted: '#EDEDEF',
    },
    text: {
      primary: '#1C1C22',
      secondary: '#4A4A57',
      muted: '#71717F',
      disabled: '#B4B4C0',
      inverse: '#FAFAFA',
    },
    border: {
      subtle: '#EBEBEF',
      default: '#DDDDE3',
      strong: '#C2C2CC',
    },
    accent: {
      base: '#5B5FC7',
      hover: '#4E52B0',
      muted: '#E8E9F5',
      text: '#4248A6',
    },
    semantic: {
      success: { base: '#2E7D57', muted: '#E6F4ED' },
      warning: { base: '#B5850B', muted: '#FEF5E0' },
      error: { base: '#C93B3B', muted: '#FCE9E9' },
      info: { base: '#3178B9', muted: '#E5F0FA' },
    },
    priority: {
      p0: { base: '#C93B3B', muted: '#FCE9E9' },
      p1: { base: '#D97A0B', muted: '#FDF0DD' },
      p2: { base: '#5B5FC7', muted: '#E8E9F5' },
      p3: { base: '#71717F', muted: '#F4F4F5' },
    },
    shadow: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
      md: '0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      lg: '0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03)',
    },
  },
  dark: {
    bg: {
      page: '#101012',
      surface: '#18181B',
      elevated: '#1F1F24',
      overlay: 'rgba(0, 0, 0, 0.60)',
      subtle: '#1F1F24',
      muted: '#27272C',
    },
    text: {
      primary: '#F0F0F3',
      secondary: '#B0B0BC',
      muted: '#8A8A96',
      disabled: '#4A4A54',
      inverse: '#1C1C22',
    },
    border: {
      subtle: '#222228',
      default: '#2C2C34',
      strong: '#3C3C46',
    },
    accent: {
      base: '#7578D9',
      hover: '#8487E0',
      muted: '#1E1E30',
      text: '#9598E5',
    },
    semantic: {
      success: { base: '#3BA874', muted: '#132E22' },
      warning: { base: '#D4A030', muted: '#2E2510' },
      error: { base: '#E05555', muted: '#301414' },
      info: { base: '#4A9ADA', muted: '#121E2C' },
    },
    priority: {
      p0: { base: '#E05555', muted: '#301414' },
      p1: { base: '#E0A030', muted: '#2E2510' },
      p2: { base: '#7578D9', muted: '#1E1E30' },
      p3: { base: '#8A8A96', muted: '#1F1F24' },
    },
    shadow: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.20)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.30), 0 1px 2px rgba(0, 0, 0, 0.20)',
      md: '0 4px 8px -2px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.20)',
      lg: '0 12px 24px -4px rgba(0, 0, 0, 0.45), 0 4px 8px -2px rgba(0, 0, 0, 0.15)',
    },
  },
} as const;

export type ThemeDefinition = typeof indigo;
export type ColorMode = 'light' | 'dark';
