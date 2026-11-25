import { beforeEach, describe, expect, it, vi } from 'vitest';

const { env, runSend } = vi.hoisted(() => ({
	env: {
		CRON_SECRET: 'secret' as string | undefined,
		SITE_URL: 'https://site.test' as string | undefined
	},
	runSend: vi.fn()
}));

vi.mock('$app/env/private', () => ({
	get CRON_SECRET() {
		return env.CRON_SECRET;
	},
	get SITE_URL() {
		return env.SITE_URL;
	}
}));
vi.mock('#lib/server/send-issue.ts', () => ({ runSend }));

const { GET } = await import('./+server.ts');

function call(authorization?: string) {
	const request = new Request('https://example.test/api/cron/send', {
		headers: authorization ? { authorization } : {}
	});
	return GET({ request, url: new URL(request.url) } as Parameters<typeof GET>[0]);
}

beforeEach(() => {
	vi.clearAllMocks();
	env.CRON_SECRET = 'secret';
	env.SITE_URL = 'https://site.test';
	runSend.mockResolvedValue(3);
});

describe('GET /api/cron/send', () => {
	it('refuses a call without the header or with the wrong secret', async () => {
		expect((await call()).status).toBe(401);
		expect((await call('Bearer wrong')).status).toBe(401);
		expect(runSend).not.toHaveBeenCalled();
	});

	it('refuses every call when CRON_SECRET is not set', async () => {
		env.CRON_SECRET = undefined;

		expect((await call('Bearer ')).status).toBe(401);
		expect((await call('Bearer undefined')).status).toBe(401);
		expect(runSend).not.toHaveBeenCalled();
	});

	it('sends with SITE_URL, not the deployment URL Vercel calls, and reports how many went out', async () => {
		const response = await call('Bearer secret');

		expect(await response.json()).toEqual({ sent: 3 });
		expect(runSend).toHaveBeenCalledWith('https://site.test', expect.any(Number));
	});

	it('refuses to send when SITE_URL is not set', async () => {
		env.SITE_URL = undefined;

		expect((await call('Bearer secret')).status).toBe(500);
		expect(runSend).not.toHaveBeenCalled();
	});
});
