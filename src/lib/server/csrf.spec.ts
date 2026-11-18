import { describe, expect, it } from 'vitest';
import { isForbiddenCrossSiteRequest } from './csrf.ts';

const origin = 'https://example.test';
const form = 'application/x-www-form-urlencoded';

function check(path: string, init: { method?: string; origin?: string; type?: string } = {}) {
	const headers = new Headers();
	if (init.origin) headers.set('origin', init.origin);
	if (init.type) headers.set('content-type', init.type);
	const url = new URL(path, origin);
	return isForbiddenCrossSiteRequest(
		new Request(url, { method: init.method ?? 'POST', headers }),
		url
	);
}

describe('isForbiddenCrossSiteRequest', () => {
	it('blocks cross-site form posts', () => {
		expect(check('/login', { origin: 'https://evil.example', type: form })).toBe(true);
		expect(check('/admin?/add', { type: form })).toBe(true);
		expect(check('/unsubscribe/abc/extra', { type: form })).toBe(true);
	});

	it('allows same-origin posts, JSON, GETs and one-click unsubscribe', () => {
		expect(check('/login', { origin, type: form })).toBe(false);
		expect(check('/login', { origin: 'https://evil.example', type: 'application/json' })).toBe(
			false
		);
		expect(check('/admin', { method: 'GET', origin: 'https://evil.example' })).toBe(false);
		expect(check('/unsubscribe/abc', { type: form })).toBe(false);
	});
});
