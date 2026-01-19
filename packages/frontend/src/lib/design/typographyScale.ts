import type { TypographyScale } from './types';

export const typographyScale: TypographyScale = {
	displayLarge: {
		fontSize: '3rem', // 48px
		fontWeight: 700, // bold
		lineHeight: 1.2, // tight
		letterSpacing: '-0.02em' // tight
	},

	displayMedium: {
		fontSize: '2.25rem',
		fontWeight: 700,
		lineHeight: 1.2,
		letterSpacing: '-0.02em'
	},
	displaySmall: {
		fontSize: '1.875rem',
		fontWeight: 700,
		lineHeight: 1.2,
		letterSpacing: '-0.02em'
	},

	// section headers
	headlineLarge: {
		fontSize: '1.875rem',
		fontWeight: 700,
		lineHeight: 1.2,
		letterSpacing: '0'
	},
	headlineMedium: {
		fontSize: '1.5rem',
		fontWeight: 700,
		lineHeight: 1.2,
		letterSpacing: '0'
	},
	headlineSmall: {
		fontSize: '1.25rem',
		fontWeight: 700,
		lineHeight: 1.4,
		letterSpacing: '0'
	},

	// component headers
	titleLarge: {
		fontSize: '1.25rem',
		fontWeight: 600,
		lineHeight: 1.4,
		letterSpacing: '0'
	},
	titleMedium: {
		fontSize: '1.125rem',
		fontWeight: 600,
		lineHeight: 1.4,
		letterSpacing: '0'
	},
	titleSmall: {
		fontSize: '1rem',
		fontWeight: 600,
		lineHeight: 1.4,
		letterSpacing: '0'
	},

	// body text
	bodyLarge: {
		fontSize: '1.125rem',
		fontWeight: 400,
		lineHeight: 1.5,
		letterSpacing: '0'
	},
	bodyMedium: {
		fontSize: '1rem',
		fontWeight: 400,
		lineHeight: 1.5,
		letterSpacing: '0'
	},
	bodySmall: {
		fontSize: '0.875rem',
		fontWeight: 400,
		lineHeight: 1.5,
		letterSpacing: '0'
	},

	// labels, buttons, captions
	labelLarge: {
		fontSize: '0.875rem',
		fontWeight: 600,
		lineHeight: 1.25,
		letterSpacing: '0.02em'
	},
	labelMedium: {
		fontSize: '0.75rem',
		fontWeight: 600,
		lineHeight: 1.25,
		letterSpacing: '0.02em'
	},
	labelSmall: {
		fontSize: '0.75rem',
		fontWeight: 500,
		lineHeight: 1.25,
		letterSpacing: '0.02em'
	}
};
