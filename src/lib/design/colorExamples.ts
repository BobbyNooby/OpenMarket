import type { Colors } from './types';

export const lightThemeColors: Colors = {
	// --- PRIMARY COLORS ---
	primary: '#3B82F6', // Blue
	secondary: '#8B5CF6', // Purple
	accent: '#10B981', // Emerald

	// --- SEMANTIC COLORS ---
	error: '#EF4444', // Red
	warning: '#F59E0B', // Amber
	success: '#22C55E', // Green
	info: '#0EA5E9', // Cyan

	// --- NEUTRALS ---
	background: '#FFFFFF', // White
	surface: '#F8FAFC', // Light slate
	text: '#0F172A', // Dark slate
	textSecondary: '#475569', // Medium slate
	textTertiary: '#94A3B8', // Light slate
	border: '#E2E8F0', // Slate-200
	disabled: '#D1D5DB' // Gray-300
};

export const darkThemeColors: Colors = {
	// --- PRIMARY COLORS (Adjusted for dark) ---
	primary: '#3B82F6', // Blue
	secondary: '#8B5CF6', // Purple
	accent: '#10B981', // Emerald

	// --- SEMANTIC COLORS ---
	error: '#EF4444', // Red
	warning: '#F59E0B', // Amber
	success: '#22C55E', // Green
	info: '#0EA5E9', // Cyan

	// --- NEUTRALS (Dark adjusted) ---
	background: '#0F172A', // Almost black
	surface: '#1E293B', // Dark slate
	text: '#F1F5F9', // Light slate
	textSecondary: '#CBD5E1', // Medium light slate
	textTertiary: '#64748B', // Darker slate
	border: '#334155', // Slate-700
	disabled: '#475569' // Slate-600
};
