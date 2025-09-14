// Design tokens - single source of truth for the Islamic design system
const colors = {
  // Neutrals - calm and breathable
  bg: 'hsl(0 0% 100%)',
  bgMuted: 'hsl(210 20% 98%)',
  fg: 'hsl(215 25% 15%)',
  fgMuted: 'hsl(215 15% 40%)',

  // Islamic accents - subtle, nature-inspired
  accent: 'hsl(165 40% 35%)',       // palm green
  accentSoft: 'hsl(165 35% 92%)',
  sand: 'hsl(38 55% 93%)',
  date: 'hsl(20 45% 35%)',

  // States
  success: 'hsl(155 45% 32%)',
  warn: 'hsl(40 85% 45%)',
  danger: 'hsl(0 65% 45%)',

  // Card backgrounds and borders
  cardBg: 'hsl(0 0% 100%)',
  border: 'hsl(210 15% 92%)',
  borderMuted: 'hsl(210 10% 96%)',
};

const darkColors = {
  bg: 'hsl(215 25% 9%)',
  bgMuted: 'hsl(215 20% 12%)',
  fg: 'hsl(0 0% 98%)',
  fgMuted: 'hsl(0 0% 70%)',
  accent: 'hsl(165 45% 48%)',
  accentSoft: 'hsl(165 25% 15%)',
  cardBg: 'hsl(215 20% 11%)',
  border: 'hsl(215 15% 20%)',
  borderMuted: 'hsl(215 10% 15%)',
};

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24, // rounded-2xl feel
  '2xl': 32,
  full: 9999,
};

const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
};

const shadow = {
  card: '0 8px 24px rgba(0,0,0,0.06)',
  soft: '0 2px 10px rgba(0,0,0,0.05)',
  focus: '0 0 0 2px hsl(165 40% 35% / 0.2)',
};

const typography = {
  fontSans: 'Inter, system-ui, sans-serif',
  fontSerif: 'Amiri, serif', // for ayah/du'a callouts
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.7,
  },
};

const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  container: '960px', // max content width
};

const animation = {
  duration: {
    fast: '160ms',
    normal: '250ms',
    slow: '400ms',
  },
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.4, 0, 0.84, 0)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

module.exports = {
  colors,
  darkColors,
  radius,
  spacing,
  shadow,
  typography,
  breakpoints,
  animation,
};