// Converts theme objects into CSS custom properties
import { lightTheme, darkTheme } from './themeComplete';
import type { Theme } from './types';

function generateCSSVariables(theme: Theme): string {
	const { colors, spacing, borderRadius, shadows, typography } = theme;

	let css = `:root[data-theme="${theme.name}"] {\n`;

	css += '\t/* Colors */\n';
	Object.entries(colors).forEach(([key, value]) => {
		css += `\t--color-${key}: ${value};\n`;
	});

	css += '\n\t/* Spacing */\n';
	Object.entries(spacing).forEach(([key, value]) => {
		css += `\t--space-${key}: ${value};\n`;
	});

	css += '\n\t/* Border Radius */\n';
	Object.entries(borderRadius).forEach(([key, value]) => {
		css += `\t--radius-${key}: ${value};\n`;
	});

	css += '\n\t/* Shadows */\n';
	Object.entries(shadows).forEach(([key, value]) => {
		css += `\t--shadow-${key}: ${value};\n`;
	});

	css += '\n\t/* Typography */\n';
	css += `\t--font-display: ${typography.fontFamily.display};\n`;
	css += `\t--font-body: ${typography.fontFamily.body};\n`;
	css += `\t--font-mono: ${typography.fontFamily.mono};\n`;

	Object.entries(typography.fontSize).forEach(([key, value]) => {
		css += `\t--text-${key}: ${value};\n`;
	});

	Object.entries(typography.fontWeight).forEach(([key, value]) => {
		css += `\t--weight-${key}: ${value};\n`;
	});

	css += '}\n';

	return css;
}

// Call this in +layout.svelte to inject theme CSS variables
export function injectThemeVariables(): void {
	if (typeof document === 'undefined') return;

	let styleElement = document.getElementById('theme-variables');
	if (!styleElement) {
		styleElement = document.createElement('style');
		styleElement.id = 'theme-variables';
		document.head.appendChild(styleElement);
	}

	const lightCSS = generateCSSVariables(lightTheme);
	const darkCSS = generateCSSVariables(darkTheme);

	styleElement.textContent = lightCSS + '\n' + darkCSS;

	const saved = localStorage.getItem('theme-mode') || 'light';
	document.documentElement.setAttribute('data-theme', saved);
}

export function getCSSVariable(name: string): string {
	if (typeof window === 'undefined') return '';
	return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}
