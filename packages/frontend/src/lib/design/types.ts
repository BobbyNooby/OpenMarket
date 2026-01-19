export type Colors = {
	// Primary brand colors
	primary: string;
	secondary: string;
	accent: string;

	// Semantic colors
	error: string;
	warning: string;
	success: string;
	info: string;

	// Neutrals
	background: string;
	surface: string;
	text: string;
	textSecondary: string;
	textTertiary: string;
	border: string;
	disabled: string;
};

export type Typography = {
	fontFamily: {
		display: string;
		body: string;
		mono: string;
	};
	fontSize: {
		xs: string; // 12px
		sm: string; // 14px
		base: string; // 16px
		lg: string; // 18px
		xl: string; // 20px
		'2xl': string; // 24px
		'3xl': string; // 30px
		'4xl': string; // 36px
		'5xl': string; // 48px
	};
	fontWeight: {
		light: number; // 300
		normal: number; // 400
		medium: number; // 500
		semibold: number; // 600
		bold: number; // 700
	};
	lineHeight: {
		tight: number; // 1.2
		normal: number; // 1.5
		relaxed: number; // 1.75
		loose: number; // 2
	};
	letterSpacing: {
		tight: string; // -0.02em
		normal: string; // 0
		wide: string; // 0.02em
	};
};

export type Spacing = {
	0: string; // 0
	1: string; // 4px
	2: string; // 8px
	3: string; // 12px
	4: string; // 16px
	6: string; // 24px
	8: string; // 32px
	10: string; // 40px
	12: string; // 48px
	16: string; // 64px
	20: string; // 80px
	24: string; // 96px
	32: string; // 128px
	40: string; // 160px
	48: string; // 192px
};

export type BorderRadius = {
	none: string; // 0
	sm: string; // 4px
	base: string; // 6px
	md: string; // 8px
	lg: string; // 12px
	xl: string; // 16px
	full: string; // 9999px
};

export type Shadows = {
	none: string;
	sm: string;
	base: string;
	md: string;
	lg: string;
	xl: string;
	'2xl': string;
};

export type TypographyScale = {
	displayLarge: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	displayMedium: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	displaySmall: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	headlineLarge: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	headlineMedium: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	headlineSmall: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	titleLarge: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	titleMedium: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	titleSmall: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	bodyLarge: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	bodyMedium: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	bodySmall: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	labelLarge: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	labelMedium: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
	labelSmall: {
		fontSize: string;
		fontWeight: number;
		lineHeight: number;
		letterSpacing: string;
	};
};

export type Theme = {
	name: 'light' | 'dark';
	colors: Colors;
	typography: Typography;
	typographyScale: TypographyScale;
	spacing: Spacing;
	borderRadius: BorderRadius;
	shadows: Shadows;
};
