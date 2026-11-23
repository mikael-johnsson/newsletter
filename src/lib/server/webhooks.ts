import { Resend, type WebhookEventPayload } from 'resend';
import { RESEND_WEBHOOK_SECRET } from '$app/env/private';
import { db } from './db.ts';
import { normalizeEmail } from './subscribe.ts';

export type SvixHeaders = { id: string | null; timestamp: string | null; signature: string | null };

// verify() only uses the signing secret, but the constructor insists on an API key.
const webhooks = new Resend('unused').webhooks;

function verify(payload: string, headers: SvixHeaders): WebhookEventPayload | undefined {
	const { id, timestamp, signature } = headers;
	if (!RESEND_WEBHOOK_SECRET || !id || !timestamp || !signature) return undefined;
	try {
		return webhooks.verify({
			payload,
			headers: { id, timestamp, signature },
			webhookSecret: RESEND_WEBHOOK_SECRET
		});
	} catch {
		return undefined;
	}
}

// Only empty fields are set, so a retried event keeps the first date and unknown addresses match nothing.
export async function handleResendWebhook(
	payload: string,
	headers: SvixHeaders,
	now = new Date()
): Promise<'ok' | 'invalid'> {
	const event = verify(payload, headers);
	if (!event) return 'invalid';
	if (event.type !== 'email.bounced' && event.type !== 'email.complained') return 'ok';

	const email = { in: event.data.to.map(normalizeEmail) };
	if (event.type === 'email.bounced') {
		await db.subscriber.updateMany({
			where: { email, bouncedAt: null },
			data: { bouncedAt: now }
		});
	} else {
		await db.subscriber.updateMany({
			where: { email, unsubscribedAt: null },
			data: { unsubscribedAt: now }
		});
	}
	return 'ok';
}
