import { createHash, timingSafeEqual } from 'node:crypto';
import { json, text } from '@sveltejs/kit';
import { CRON_SECRET } from '$app/env/private';
import { runSend } from '#lib/server/send-issue.ts';
import type { RequestHandler } from './$types';

// Stops well before Vercel's function time limit; the next run picks up the rest.
const RUN_BUDGET_MS = 45_000;

function isAuthorized(header: string | null): boolean {
	if (!CRON_SECRET || !header) return false;
	const digest = (value: string) => createHash('sha256').update(value).digest();
	return timingSafeEqual(digest(header), digest(`Bearer ${CRON_SECRET}`));
}

export const GET: RequestHandler = async ({ request, url }) => {
	if (!isAuthorized(request.headers.get('authorization'))) {
		return text('Unauthorized', { status: 401 });
	}

	const sent = await runSend(url.origin, Date.now() + RUN_BUDGET_MS);
	return json({ sent });
};
