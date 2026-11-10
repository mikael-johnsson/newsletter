import { randomUUID } from 'node:crypto';
import { db } from './db.ts';
import { sendConfirmation } from './mail.ts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;

export function normalizeEmail(raw: string): string {
	return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return EMAIL_PATTERN.test(email);
}

// Every path that doesn't throw looks the same to the caller, so the form never reveals who is on the list.
export async function subscribe(email: string, origin: string): Promise<void> {
	const existing = await db.subscriber.findUnique({ where: { email } });
	if (existing?.confirmedAt && !existing.unsubscribedAt) return;

	let token = existing?.confirmToken;
	if (!existing) {
		token = randomUUID();
		await db.subscriber.create({ data: { email, confirmToken: token } });
	} else if (existing.unsubscribedAt || !token) {
		token = randomUUID();
		await db.subscriber.update({
			where: { id: existing.id },
			data: { confirmToken: token, confirmedAt: null, unsubscribedAt: null }
		});
	}

	await sendConfirmation(email, `${origin}/confirm/${token}`);
}

export async function confirmSubscription(token: string): Promise<boolean> {
	const subscriber = await db.subscriber.findUnique({ where: { confirmToken: token } });
	if (!subscriber || subscriber.unsubscribedAt) return false;

	if (!subscriber.confirmedAt) {
		await db.subscriber.update({ where: { id: subscriber.id }, data: { confirmedAt: new Date() } });
	}
	return true;
}
