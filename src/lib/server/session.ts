import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(secret: string, now = Date.now()): string {
	const expiresAt = String(now + SESSION_MAX_AGE_SECONDS * 1000);
	return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function isValidSession(
	token: string | undefined,
	secret: string,
	now = Date.now()
): boolean {
	const parts = token?.split('.');
	if (!parts || parts.length !== 2) return false;

	const [expiresAt, signature] = parts;
	const expected = Buffer.from(sign(expiresAt, secret));
	const actual = Buffer.from(signature);
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

	return Number(expiresAt) > now;
}
