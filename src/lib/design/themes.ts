export type Theme = {
	name: string;
	colors: {
		primary: string;
		secondary: string;
		tertiary: string;
		accent: string;

		background: string;
		surface: string;
		overlay: string;

		error: string;
		warning: string;
		success: string;
		info: string;

		onPrimary: string;
		onSecondary: string;
		onTertiary: string;
		onBackground: string;
		onSurface: string;
		onError: string;
		onWarning: string;
		onSuccess: string;
		onInfo: string;

		border: string;
		focus: string;
		disabled: string;
		link: string;
	};
};

export const lightTheme: Theme = {
	name: 'light',
	colors: {
		primary: '#3B82F6', // blue-500
		secondary: '#8B5CF6', // violet-500
		tertiary: '#EC4899', // pink-500
		accent: '#10B981', // emerald-500

		background: '#FFFFFF', // white
		surface: '#F8FAFC', // slate-50
		overlay: 'rgba(0,0,0,0.05)',

		error: '#EF4444', // red-500
		warning: '#F59E0B', // amber-500
		success: '#22C55E', // green-500
		info: '#0EA5E9', // sky-500

		onPrimary: '#FFFFFF',
		onSecondary: '#FFFFFF',
		onTertiary: '#FFFFFF',
		onBackground: '#0F172A', // slate-900
		onSurface: '#1E293B', // slate-800
		onError: '#FFFFFF',
		onWarning: '#FFFFFF',
		onSuccess: '#FFFFFF',
		onInfo: '#FFFFFF',

		border: '#E2E8F0', // slate-200
		focus: '#2563EB', // blue-600
		disabled: '#94A3B8', // slate-400
		link: '#1D4ED8' // blue-700
	}
};

export const darkTheme: Theme = {
	name: 'dark',
	colors: {
		primary: '#60A5FA', // blue-400
		secondary: '#A78BFA', // violet-400
		tertiary: '#F472B6', // pink-400
		accent: '#34D399', // emerald-400

		background: '#0B1120', // almost black
		surface: '#1E293B', // slate-800
		overlay: 'rgba(255,255,255,0.05)',

		error: '#F87171', // red-400
		warning: '#FBBF24', // amber-400
		success: '#4ADE80', // green-400
		info: '#38BDF8', // sky-400

		onPrimary: '#0B1120', // dark text on lighter primaries
		onSecondary: '#0B1120',
		onTertiary: '#0B1120',
		onBackground: '#E2E8F0', // slate-200
		onSurface: '#F1F5F9', // slate-100
		onError: '#0B1120',
		onWarning: '#0B1120',
		onSuccess: '#0B1120',
		onInfo: '#0B1120',

		border: '#334155', // slate-700
		focus: '#93C5FD', // blue-300
		disabled: '#475569', // slate-600
		link: '#93C5FD' // blue-300
	}
};
