import { createHash, timingSafeEqual } from 'node:crypto';
import { json, text } from '@sveltejs/kit';
import { CRON_SECRET, SITE_URL } from '$app/env/private';
import { runSend } from '#lib/server/send-issue.ts';
import type { RequestHandler } from './$types';

// Stops well before Vercel's function time limit; the next run picks up the rest.
const RUN_BUDGET_MS = 45_000;

function isAuthorized(header: string | null): boolean {
	if (!CRON_SECRET || !header) return false;
	const digest = (value: string) => createHash('sha256').update(value).digest();
	return timingSafeEqual(digest(header), digest(`Bearer ${CRON_SECRET}`));
}

export const GET: RequestHandler = async ({ request }) => {
	if (!isAuthorized(request.headers.get('authorization'))) {
		return text('Unauthorized', { status: 401 });
	}
	// Vercel calls the deployment's own URL, so the request origin would give protected, short-lived unsubscribe links.
	if (!SITE_URL) return text('SITE_URL is not set', { status: 500 });

	const sent = await runSend(SITE_URL, Date.now() + RUN_BUDGET_MS);
	return json({ sent });
};
