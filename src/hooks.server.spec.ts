import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$app/env/private', () => ({ SESSION_SECRET: 'secret' }));

const { handle } = await import('./hooks.server.ts');

describe('handle', () => {
	it('sends /admin/subscribers to login without a session', async () => {
		const url = new URL('https://example.test/admin/subscribers');
		const event = {
			url,
			request: new Request(url),
			cookies: { get: () => undefined },
			locals: {}
		} as unknown as RequestEvent;
		const resolve = vi.fn();

		await expect(handle({ event, resolve })).rejects.toMatchObject({
			status: 303,
			location: '/login'
		});
		expect(resolve).not.toHaveBeenCalled();
	});
});
