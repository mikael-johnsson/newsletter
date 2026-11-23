import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db.ts';
import { handleResendWebhook, type SvixHeaders } from './webhooks.ts';

const SECRET_BYTES = Buffer.from('test-signing-secret');

vi.mock('$app/env/private', () => ({
	RESEND_WEBHOOK_SECRET: `whsec_${Buffer.from('test-signing-secret').toString('base64')}`
}));
vi.mock('./db.ts', () => ({ db: { subscriber: { updateMany: vi.fn() } } }));

const updateMany = vi.mocked(db.subscriber.updateMany);
const now = new Date('2026-11-23T10:00:00Z');

// Signs the way Svix does, so the real verification runs.
function signed(event: object): { payload: string; headers: SvixHeaders } {
	const payload = JSON.stringify(event);
	const id = 'msg_1';
	const timestamp = String(Math.floor(Date.now() / 1000));
	const mac = createHmac('sha256', SECRET_BYTES)
		.update(`${id}.${timestamp}.${payload}`)
		.digest('base64');
	return { payload, headers: { id, timestamp, signature: `v1,${mac}` } };
}

function emailEvent(type: string, to = ['  Anna@Example.SE ']) {
	return signed({
		type,
		created_at: now.toISOString(),
		data: { email_id: 'e1', from: 'a@b.se', to, subject: 'Hej', created_at: now.toISOString() }
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('handleResendWebhook', () => {
	it('rejects a wrong signature and writes nothing', async () => {
		const { payload, headers } = emailEvent('email.bounced');

		expect(await handleResendWebhook(payload, { ...headers, signature: 'v1,bad' }, now)).toBe(
			'invalid'
		);
		expect(await handleResendWebhook(`${payload} `, headers, now)).toBe('invalid');
		expect(updateMany).not.toHaveBeenCalled();
	});

	it('rejects a request without signature headers', async () => {
		const { payload } = emailEvent('email.bounced');

		expect(
			await handleResendWebhook(payload, { id: null, timestamp: null, signature: null }, now)
		).toBe('invalid');
		expect(updateMany).not.toHaveBeenCalled();
	});

	it('marks a bounced address, only if it has not bounced before', async () => {
		const { payload, headers } = emailEvent('email.bounced');

		expect(await handleResendWebhook(payload, headers, now)).toBe('ok');
		expect(updateMany.mock.calls[0][0]).toEqual({
			where: { email: { in: ['anna@example.se'] }, bouncedAt: null },
			data: { bouncedAt: now }
		});
	});

	it('unsubscribes a reader who complained, only if not already unsubscribed', async () => {
		const { payload, headers } = emailEvent('email.complained');

		expect(await handleResendWebhook(payload, headers, now)).toBe('ok');
		expect(updateMany.mock.calls[0][0]).toEqual({
			where: { email: { in: ['anna@example.se'] }, unsubscribedAt: null },
			data: { unsubscribedAt: now }
		});
	});

	it('accepts other events without writing', async () => {
		const { payload, headers } = emailEvent('email.delivered');

		expect(await handleResendWebhook(payload, headers, now)).toBe('ok');
		expect(updateMany).not.toHaveBeenCalled();
	});
});
