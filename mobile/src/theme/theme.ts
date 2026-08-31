// Design tokens lifted from project/Kcal AI.dc.html — the Claude Design prototype.
export const colors = {
  lime: '#E8F982',
  limeHover: '#dff06a',
  black: '#111111',
  white: '#ffffff',
  bg: '#e9e9ec',
  textMuted: '#5b5b60',
  textFaint: '#8a8a8f',
  textGhost: '#a0a0a5',
  border: '#dcdce1',
  borderSoft: '#e2e2e6',
  divider: '#eeeef1',
  fillSoft: '#f4f4f6',
  fillSofter: '#f6f6f8',
  track: '#f0f0f3',
  limeDeepText: '#4d5406',
} as const;

export const font = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
} as const;

export const radius = {
  pill: 999,
  lg: 22,
  md: 18,
  sm: 14,
} as const;
