import { text } from '@sveltejs/kit';
import { handleResendWebhook } from '#lib/server/webhooks.ts';
import type { RequestHandler } from './$types';

// The signature covers the raw body, so it is read as text and never re-serialized.
export const POST: RequestHandler = async ({ request }) => {
	const result = await handleResendWebhook(await request.text(), {
		id: request.headers.get('svix-id'),
		timestamp: request.headers.get('svix-timestamp'),
		signature: request.headers.get('svix-signature')
	});
	return result === 'invalid' ? text('Invalid signature', { status: 400 }) : text('OK');
};
