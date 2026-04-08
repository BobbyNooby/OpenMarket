// Mirror of packages/server/src/utils/color.ts.
// Theme variables are stored as HSL triplets like "217.2 91.2% 59.8%"
// but admins type hex in the picker, so we convert in both directions.

const HSL_RE = /^\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%\s*$/;

export function validateHsl(value: string): boolean {
	return HSL_RE.test(value);
}

export function hexToHsl(hex: string): string | null {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) return null;
	const int = parseInt(m[1], 16);
	const r = ((int >> 16) & 0xff) / 255;
	const g = ((int >> 8) & 0xff) / 255;
	const b = (int & 0xff) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}

	const hDeg = +(h * 360).toFixed(1);
	const sPct = +(s * 100).toFixed(1);
	const lPct = +(l * 100).toFixed(1);
	return `${hDeg} ${sPct}% ${lPct}%`;
}

export function hslToHex(hsl: string): string | null {
	if (!validateHsl(hsl)) return null;
	const parts = hsl.trim().split(/\s+/);
	const h = parseFloat(parts[0]);
	const s = parseFloat(parts[1]) / 100;
	const l = parseFloat(parts[2]) / 100;

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hPrime = h / 60;
	const x = c * (1 - Math.abs((hPrime % 2) - 1));
	let r1 = 0, g1 = 0, b1 = 0;
	if (hPrime >= 0 && hPrime < 1) { r1 = c; g1 = x; }
	else if (hPrime < 2) { r1 = x; g1 = c; }
	else if (hPrime < 3) { g1 = c; b1 = x; }
	else if (hPrime < 4) { g1 = x; b1 = c; }
	else if (hPrime < 5) { r1 = x; b1 = c; }
	else { r1 = c; b1 = x; }

	const m = l - c / 2;
	const r = Math.round((r1 + m) * 255);
	const g = Math.round((g1 + m) * 255);
	const b = Math.round((b1 + m) * 255);
	return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
