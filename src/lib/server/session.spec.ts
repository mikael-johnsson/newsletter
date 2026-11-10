import { describe, expect, it } from 'vitest';
import { SESSION_MAX_AGE_SECONDS, createSessionToken, isValidSession } from './session';

const secret = 'test-secret';
const now = Date.UTC(2026, 10, 10);

describe('isValidSession', () => {
	it('accepts a fresh token', () => {
		expect(isValidSession(createSessionToken(secret, now), secret, now)).toBe(true);
	});

	it('rejects a missing or garbled token', () => {
		expect(isValidSession(undefined, secret, now)).toBe(false);
		expect(isValidSession('not-a-token', secret, now)).toBe(false);
	});

	it('rejects a token whose expiry was edited', () => {
		const [, signature] = createSessionToken(secret, now).split('.');
		const forged = `${now + SESSION_MAX_AGE_SECONDS * 2000}.${signature}`;
		expect(isValidSession(forged, secret, now)).toBe(false);
	});

	it('rejects a token signed with another secret', () => {
		expect(isValidSession(createSessionToken('old-secret', now), secret, now)).toBe(false);
	});

	it('rejects an expired token', () => {
		const later = now + SESSION_MAX_AGE_SECONDS * 1000 + 1;
		expect(isValidSession(createSessionToken(secret, now), secret, later)).toBe(false);
	});
});
