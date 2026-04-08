import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../middleware/rbac';
import { logAuditEvent } from '../../services/audit';
import {
	getSiteConfig,
	getSiteTheme,
	setSiteConfig,
	setSiteTheme,
	resetSiteThemeVariable,
	resetSiteThemeVariant,
	THEME_VARIABLES,
	type ThemeVariant,
} from '../../services/site-config';
import { validateHsl } from '../../utils/color';

const ALLOWED_VARIABLES = new Set<string>(THEME_VARIABLES);

export const adminSiteConfigRoutes = new Elysia()
	.use(authMiddleware)

	// GET /admin/site-config — full config + both theme variants (admin only)
	.get('/site-config', ({ session, set }) => {
		if (!session.permissions.includes('admin:settings')) {
			set.status = 403;
			return { success: false, error: 'Forbidden' };
		}
		return { success: true, data: { config: getSiteConfig(), theme: getSiteTheme() } };
	})

	// PUT /admin/site-config — update non-theme config
	.put(
		'/site-config',
		async ({ body, session, set }) => {
			if (!session.permissions.includes('admin:settings')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			try {
				await setSiteConfig(body, session.user!.id);
				await logAuditEvent(session.user!.id, 'site_config:update', 'site_config', 'config', { keys: Object.keys(body) });
				return { success: true };
			} catch (err: any) {
				console.error('Update site config error:', err);
				set.status = 500;
				return { success: false, error: err?.message ?? 'Unknown error' };
			}
		},
		{
			body: t.Record(t.String(), t.String()),
		},
	)

	// PUT /admin/site-theme — update theme variables for one variant
	.put(
		'/site-theme',
		async ({ body, session, set }) => {
			if (!session.permissions.includes('admin:settings')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			if (body.variant !== 'light' && body.variant !== 'dark') {
				set.status = 400;
				return { success: false, error: 'variant must be light or dark' };
			}

			// Validate every value is a clean HSL triplet and every key is a known variable
			for (const [variable, value] of Object.entries(body.variables)) {
				if (!ALLOWED_VARIABLES.has(variable)) {
					set.status = 400;
					return { success: false, error: `Unknown theme variable: ${variable}` };
				}
				if (!validateHsl(value)) {
					set.status = 400;
					return { success: false, error: `Invalid HSL value for ${variable}: ${value}` };
				}
			}

			try {
				await setSiteTheme(body.variant as ThemeVariant, body.variables, session.user!.id);
				await logAuditEvent(
					session.user!.id,
					'site_theme:update',
					'site_theme',
					body.variant,
					{ variables: Object.keys(body.variables) },
				);
				return { success: true };
			} catch (err: any) {
				console.error('Update site theme error:', err);
				set.status = 500;
				return { success: false, error: err?.message ?? 'Unknown error' };
			}
		},
		{
			body: t.Object({
				variant: t.String(),
				variables: t.Record(t.String(), t.String()),
			}),
		},
	)

	// POST /admin/site-theme/reset — reset one variant or one variable to default
	.post(
		'/site-theme/reset',
		async ({ body, session, set }) => {
			if (!session.permissions.includes('admin:settings')) {
				set.status = 403;
				return { success: false, error: 'Forbidden' };
			}

			if (body.variant !== 'light' && body.variant !== 'dark') {
				set.status = 400;
				return { success: false, error: 'variant must be light or dark' };
			}

			try {
				if (body.variable) {
					if (!ALLOWED_VARIABLES.has(body.variable)) {
						set.status = 400;
						return { success: false, error: `Unknown theme variable: ${body.variable}` };
					}
					await resetSiteThemeVariable(body.variant as ThemeVariant, body.variable);
					await logAuditEvent(
						session.user!.id,
						'site_theme:reset_variable',
						'site_theme',
						`${body.variant}/${body.variable}`,
					);
				} else {
					await resetSiteThemeVariant(body.variant as ThemeVariant);
					await logAuditEvent(
						session.user!.id,
						'site_theme:reset_variant',
						'site_theme',
						body.variant,
					);
				}
				return { success: true };
			} catch (err: any) {
				console.error('Reset site theme error:', err);
				set.status = 500;
				return { success: false, error: err?.message ?? 'Unknown error' };
			}
		},
		{
			body: t.Object({
				variant: t.String(),
				variable: t.Optional(t.String()),
			}),
		},
	);
