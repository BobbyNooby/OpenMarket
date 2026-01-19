// Design tokens for typography, spacing, colors, etc
import type { Typography, Spacing, BorderRadius, Shadows } from './types';

export const typographyTokens: Typography = {
	fontFamily: {
		display: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
		body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
		mono: "'Fira Code', 'Monaco', 'Courier New', monospace"
	},
	fontSize: {
		xs: '0.75rem', // 12px
		sm: '0.875rem', // 14px
		base: '1rem', // 16px
		lg: '1.125rem', // 18px
		xl: '1.25rem', // 20px
		'2xl': '1.5rem', // 24px
		'3xl': '1.875rem', // 30px
		'4xl': '2.25rem', // 36px
		'5xl': '3rem' // 48px
	},
	fontWeight: {
		light: 300,
		normal: 400,
		medium: 500,
		semibold: 600,
		bold: 700
	},
	lineHeight: {
		tight: 1.2,
		normal: 1.5,
		relaxed: 1.75,
		loose: 2
	},
	letterSpacing: {
		tight: '-0.02em',
		normal: '0',
		wide: '0.02em'
	}
};

// 4px base unit spacing
export const spacingTokens: Spacing = {
	0: '0',
	1: '0.25rem', // 4px
	2: '0.5rem', // 8px
	3: '0.75rem', // 12px
	4: '1rem', // 16px
	6: '1.5rem', // 24px
	8: '2rem', // 32px
	10: '2.5rem', // 40px
	12: '3rem', // 48px
	16: '4rem', // 64px
	20: '5rem', // 80px
	24: '6rem', // 96px
	32: '8rem', // 128px
	40: '10rem', // 160px
	48: '12rem' // 192px
};

export const borderRadiusTokens: BorderRadius = {
	none: '0',
	sm: '0.25rem',
	base: '0.375rem',
	md: '0.5rem',
	lg: '0.75rem',
	xl: '1rem',
	full: '9999px'
};

export const shadowTokens: Shadows = {
	none: 'none',
	sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
	base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
	md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
	lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
	xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
	'2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
};
