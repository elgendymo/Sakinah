const { colors, darkColors, radius, spacing, shadow, typography, breakpoints } = require('./tokens');

/** Tailwind preset that maps design tokens to Tailwind theme */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        // Map token colors to Tailwind
        bg: 'var(--bg)',
        'bg-muted': 'var(--bg-muted)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        sand: 'var(--sand)',
        date: 'var(--date)',
        success: 'var(--success)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        'card-bg': 'var(--card-bg)',
        border: 'var(--border)',
        'border-muted': 'var(--border-muted)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      spacing: {
        // Map spacing tokens to Tailwind
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        soft: 'var(--shadow-soft)',
        focus: 'var(--shadow-focus)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        serif: 'var(--font-serif)',
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        md: 'var(--text-md)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
      },
      fontWeight: {
        normal: 'var(--font-normal)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
      },
      lineHeight: {
        tight: 'var(--leading-tight)',
        snug: 'var(--leading-snug)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
      },
      screens: {
        sm: breakpoints.sm,
        md: breakpoints.md,
        lg: breakpoints.lg,
        xl: breakpoints.xl,
      },
      container: {
        center: true,
        padding: 'var(--space-lg)',
        screens: {
          DEFAULT: breakpoints.container,
        },
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        DEFAULT: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        in: 'var(--ease-in)',
        'in-out': 'var(--ease-in-out)',
      },
    },
  },
  plugins: [
    // Plugin for logical properties (RTL support)
    function({ addUtilities }) {
      const logicalUtilities = {
        '.ms-auto': { 'margin-inline-start': 'auto' },
        '.me-auto': { 'margin-inline-end': 'auto' },
        '.ps-sm': { 'padding-inline-start': 'var(--space-sm)' },
        '.pe-sm': { 'padding-inline-end': 'var(--space-sm)' },
        '.ps-md': { 'padding-inline-start': 'var(--space-md)' },
        '.pe-md': { 'padding-inline-end': 'var(--space-md)' },
        '.ps-lg': { 'padding-inline-start': 'var(--space-lg)' },
        '.pe-lg': { 'padding-inline-end': 'var(--space-lg)' },
        '.border-s': { 'border-inline-start': '1px solid var(--border)' },
        '.border-e': { 'border-inline-end': '1px solid var(--border)' },
      };
      addUtilities(logicalUtilities);
    },
  ],
};
