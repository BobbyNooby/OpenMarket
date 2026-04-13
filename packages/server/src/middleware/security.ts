import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';

// Rate limiter for auth endpoints (login, register, password reset)
// 10 attempts per minute per IP — blocks brute force without disrupting normal use
export const authRateLimit = new Elysia({ name: 'auth-rate-limit' })
	.use(
		rateLimit({
			max: 10,
			duration: 60_000,
			scoping: 'scoped',
			generator: (req) => req.headers.get('x-forwarded-for') || 'unknown',
			errorResponse: new Response(JSON.stringify({
				success: false,
				error: 'Too many attempts. Try again in a minute.',
			}), { status: 429, headers: { 'content-type': 'application/json' } }),
		}),
	);

// Rate limiter for general API — 300 requests per minute per IP
export const apiRateLimit = new Elysia({ name: 'api-rate-limit' })
	.use(
		rateLimit({
			max: 300,
			duration: 60_000,
			scoping: 'scoped',
			generator: (req) => req.headers.get('x-forwarded-for') || 'unknown',
			errorResponse: new Response(JSON.stringify({
				success: false,
				error: 'Rate limit exceeded. Slow down.',
			}), { status: 429, headers: { 'content-type': 'application/json' } }),
		}),
	);

// Security headers — set on every response
export const securityHeaders = new Elysia({ name: 'security-headers' })
	.onAfterHandle(({ set }) => {
		set.headers['x-content-type-options'] = 'nosniff';
		set.headers['x-frame-options'] = 'DENY';
		set.headers['x-xss-protection'] = '1; mode=block';
		set.headers['referrer-policy'] = 'strict-origin-when-cross-origin';
		set.headers['permissions-policy'] = 'camera=(), microphone=(), geolocation=()';
	});
