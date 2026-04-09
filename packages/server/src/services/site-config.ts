// Site config + theme service.
// All data is loaded into memory on boot and refreshed on every write.
// Reads are O(1) — perfect for the root layout request that hits this on every page load.

import { db } from "../db/db";
import { siteConfigTable, siteThemeTable, siteAssetsTable } from "../db/schemas";
import { eq, and } from "drizzle-orm";

// --- defaults ---

export const CONFIG_DEFAULTS: Record<string, string> = {
	site_name: "OpenMarket",
	site_tagline: "The marketplace for trading game items and currencies",
	site_logo_url: "",
	site_favicon_url: "",
	footer_text: "",
	support_url: "",
	discord_url: "",
};

// All 19 shadcn variables (matches packages/frontend/src/app.css)
export const THEME_VARIABLES = [
	"background", "foreground",
	"muted", "muted-foreground",
	"popover", "popover-foreground",
	"card", "card-foreground",
	"border", "input",
	"primary", "primary-foreground",
	"secondary", "secondary-foreground",
	"accent", "accent-foreground",
	"destructive", "destructive-foreground",
	"ring",
] as const;

export type ThemeVariable = (typeof THEME_VARIABLES)[number];
export type ThemeVariant = "light" | "dark";
export type ThemeVariables = Record<string, string>;

export const THEME_DEFAULTS: Record<ThemeVariant, ThemeVariables> = {
	light: {
		background: "0 0% 100%",
		foreground: "222.2 47.4% 11.2%",
		muted: "210 40% 96.1%",
		"muted-foreground": "215.4 16.3% 46.9%",
		popover: "0 0% 100%",
		"popover-foreground": "222.2 47.4% 11.2%",
		card: "210 40% 98%",
		"card-foreground": "222.2 47.4% 11.2%",
		border: "214.3 31.8% 91.4%",
		input: "214.3 31.8% 91.4%",
		primary: "217.2 91.2% 59.8%",
		"primary-foreground": "0 0% 100%",
		secondary: "210 40% 98%",
		"secondary-foreground": "222.2 47.4% 11.2%",
		accent: "210 40% 96.1%",
		"accent-foreground": "222.2 47.4% 11.2%",
		destructive: "0 84.2% 60.2%",
		"destructive-foreground": "0 0% 100%",
		ring: "217.2 91.2% 59.8%",
	},
	dark: {
		background: "224 71.4% 4.1%",
		foreground: "210 20% 98%",
		muted: "215 27.9% 16.9%",
		"muted-foreground": "217.9 10.6% 64.9%",
		popover: "224 71.4% 4.1%",
		"popover-foreground": "210 20% 98%",
		card: "222.2 47.4% 11.2%",
		"card-foreground": "210 20% 98%",
		border: "215 27.9% 16.9%",
		input: "215 27.9% 16.9%",
		primary: "217.2 91.2% 59.8%",
		"primary-foreground": "222.2 47.4% 11.2%",
		secondary: "222.2 47.4% 11.2%",
		"secondary-foreground": "210 20% 98%",
		accent: "215 27.9% 16.9%",
		"accent-foreground": "210 20% 98%",
		destructive: "0 62.8% 30.6%",
		"destructive-foreground": "210 20% 98%",
		ring: "217.2 91.2% 59.8%",
	},
};

// --- in-memory caches ---

let configOverrides: Record<string, string> = {};
let themeOverrides: Record<ThemeVariant, ThemeVariables> = { light: {}, dark: {} };
let assetOverrides: Record<string, string> = {};
let loaded = false;

// --- public API ---

export async function loadSiteConfig() {
	const [configRows, themeRows, assetRows] = await Promise.all([
		db.select({ key: siteConfigTable.key, value: siteConfigTable.value }).from(siteConfigTable),
		db.select({
			variant: siteThemeTable.variant,
			variable: siteThemeTable.variable,
			value: siteThemeTable.value,
		}).from(siteThemeTable),
		db.select({ slot: siteAssetsTable.slot, url: siteAssetsTable.url }).from(siteAssetsTable),
	]);

	configOverrides = {};
	for (const row of configRows) configOverrides[row.key] = row.value;

	themeOverrides = { light: {}, dark: {} };
	for (const row of themeRows) {
		themeOverrides[row.variant as ThemeVariant][row.variable] = row.value;
	}

	assetOverrides = {};
	for (const row of assetRows) assetOverrides[row.slot] = row.url;

	loaded = true;
	console.log(`Site config loaded: ${configRows.length} config row(s), ${themeRows.length} theme row(s), ${assetRows.length} asset(s)`);
}

export function getSiteConfig(): Record<string, string> {
	return { ...CONFIG_DEFAULTS, ...configOverrides };
}

export function getSiteTheme(): Record<ThemeVariant, ThemeVariables> {
	return {
		light: { ...THEME_DEFAULTS.light, ...themeOverrides.light },
		dark: { ...THEME_DEFAULTS.dark, ...themeOverrides.dark },
	};
}

export function getSiteAssets(): Record<string, string> {
	return { ...assetOverrides };
}

export function isLoaded() {
	return loaded;
}

// --- write helpers (called from admin endpoints) ---

const ALLOWED_CONFIG_KEYS = new Set(Object.keys(CONFIG_DEFAULTS));

export async function setSiteConfig(updates: Record<string, string>, userId: string) {
	const entries = Object.entries(updates).filter(([k]) => ALLOWED_CONFIG_KEYS.has(k));
	if (entries.length === 0) return;

	for (const [key, value] of entries) {
		await db
			.insert(siteConfigTable)
			.values({ key, value, updated_by: userId, updated_at: new Date() })
			.onConflictDoUpdate({
				target: siteConfigTable.key,
				set: { value, updated_by: userId, updated_at: new Date() },
			});
	}

	// Refresh in-memory cache
	for (const [key, value] of entries) configOverrides[key] = value;
}

const ALLOWED_THEME_VARIABLES = new Set<string>(THEME_VARIABLES);

export async function setSiteTheme(variant: ThemeVariant, updates: ThemeVariables, userId: string) {
	const entries = Object.entries(updates).filter(([k]) => ALLOWED_THEME_VARIABLES.has(k));
	if (entries.length === 0) return;

	for (const [variable, value] of entries) {
		await db
			.insert(siteThemeTable)
			.values({ variant, variable, value, updated_by: userId, updated_at: new Date() })
			.onConflictDoUpdate({
				target: [siteThemeTable.variant, siteThemeTable.variable],
				set: { value, updated_by: userId, updated_at: new Date() },
			});
	}

	for (const [variable, value] of entries) themeOverrides[variant][variable] = value;
}

// Reset a specific variable for one variant by deleting its row (default takes over)
export async function resetSiteThemeVariable(variant: ThemeVariant, variable: string) {
	await db
		.delete(siteThemeTable)
		.where(and(eq(siteThemeTable.variant, variant), eq(siteThemeTable.variable, variable)));
	delete themeOverrides[variant][variable];
}

// Reset every variable for one variant by deleting all of its rows
export async function resetSiteThemeVariant(variant: ThemeVariant) {
	await db.delete(siteThemeTable).where(eq(siteThemeTable.variant, variant));
	themeOverrides[variant] = {};
}
