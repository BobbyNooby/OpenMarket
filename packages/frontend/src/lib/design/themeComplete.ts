import type { Theme } from './types';
import { typographyScale } from './typographyScale';
import { spacingTokens, borderRadiusTokens, shadowTokens, typographyTokens } from './tokens';
import { lightThemeColors, darkThemeColors } from './colorExamples';

export const lightTheme: Theme = {
	name: 'light',
	colors: lightThemeColors,
	typography: typographyTokens,
	typographyScale: typographyScale,
	spacing: spacingTokens,
	borderRadius: borderRadiusTokens,
	shadows: shadowTokens
};

export const darkTheme: Theme = {
	name: 'dark',
	colors: darkThemeColors,
	typography: typographyTokens,
	typographyScale: typographyScale,
	spacing: spacingTokens,
	borderRadius: borderRadiusTokens,
	shadows: shadowTokens
};
