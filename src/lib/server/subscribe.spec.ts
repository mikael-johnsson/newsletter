import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db.ts';
import { sendConfirmation } from './mail.ts';
import { confirmSubscription, isValidEmail, normalizeEmail, subscribe } from './subscribe.ts';

vi.mock('./db.ts', () => ({
	db: { subscriber: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } }
}));
vi.mock('./mail.ts', () => ({ sendConfirmation: vi.fn() }));

const findUnique = vi.mocked(db.subscriber.findUnique);
const create = vi.mocked(db.subscriber.create);
const update = vi.mocked(db.subscriber.update);
const send = vi.mocked(sendConfirmation);

const origin = 'https://example.test';
const email = 'anna@example.se';

function subscriber(fields: Record<string, unknown>) {
	return {
		id: 'sub-1',
		email,
		unsubscribeToken: 'unsub',
		confirmToken: 'old-token',
		confirmedAt: null,
		unsubscribedAt: null,
		createdAt: new Date(),
		...fields
	} as Awaited<ReturnType<typeof db.subscriber.findUnique>>;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('isValidEmail', () => {
	it('accepts a complete address', () => {
		expect(isValidEmail('anna@example.se')).toBe(true);
		expect(isValidEmail('anna.b+news@mail.example.co.uk')).toBe(true);
	});

	it('rejects incomplete addresses', () => {
		for (const value of [
			'',
			'anna',
			'anna@',
			'@example.se',
			'anna@example',
			'anna@example.',
			'an na@example.se'
		]) {
			expect(isValidEmail(value), value).toBe(false);
		}
	});
});

describe('normalizeEmail', () => {
	it('treats case and surrounding spaces as the same address', () => {
		expect(normalizeEmail('  Anna@Example.SE ')).toBe('anna@example.se');
	});
});

describe('subscribe', () => {
	it('creates a new subscriber and sends a confirm link', async () => {
		findUnique.mockResolvedValue(null);

		await subscribe(email, origin);

		const token = create.mock.calls[0][0].data.confirmToken;
		expect(token).toBeTruthy();
		expect(send).toHaveBeenCalledWith(email, `${origin}/confirm/${token}`);
	});

	it('resends the same link to an unconfirmed subscriber', async () => {
		findUnique.mockResolvedValue(subscriber({}));

		await subscribe(email, origin);

		expect(create).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
		expect(send).toHaveBeenCalledWith(email, `${origin}/confirm/old-token`);
	});

	it('does nothing for a confirmed subscriber', async () => {
		findUnique.mockResolvedValue(subscriber({ confirmedAt: new Date() }));

		await subscribe(email, origin);

		expect(create).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
		expect(send).not.toHaveBeenCalled();
	});

	it('makes a returning unsubscriber confirm again with a new link', async () => {
		findUnique.mockResolvedValue(
			subscriber({ confirmedAt: new Date(), unsubscribedAt: new Date() })
		);

		await subscribe(email, origin);

		const { data } = update.mock.calls[0][0];
		expect(data).toMatchObject({ confirmedAt: null, unsubscribedAt: null });
		expect(data.confirmToken).not.toBe('old-token');
		expect(send).toHaveBeenCalledWith(email, `${origin}/confirm/${data.confirmToken}`);
	});
});

describe('confirmSubscription', () => {
	it('confirms an unconfirmed subscriber', async () => {
		findUnique.mockResolvedValue(subscriber({}));

		expect(await confirmSubscription('old-token')).toBe(true);
		expect(update.mock.calls[0][0].data.confirmedAt).toBeInstanceOf(Date);
	});

	it('rejects an unknown token', async () => {
		findUnique.mockResolvedValue(null);

		expect(await confirmSubscription('nope')).toBe(false);
	});

	it('rejects an old link after the reader has unsubscribed', async () => {
		findUnique.mockResolvedValue(
			subscriber({ confirmedAt: new Date(), unsubscribedAt: new Date() })
		);

		expect(await confirmSubscription('old-token')).toBe(false);
		expect(update).not.toHaveBeenCalled();
	});
});
