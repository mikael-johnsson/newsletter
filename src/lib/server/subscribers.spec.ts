import { describe, expect, it, vi } from 'vitest';
import { db } from './db.ts';
import { getSubscriberCounts } from './subscribers.ts';

vi.mock('./db.ts', () => ({ db: { subscriber: { findMany: vi.fn() } } }));

const day = (n: number) => new Date(2026, 10, n);

describe('getSubscriberCounts', () => {
	it('puts each subscriber in exactly one group', async () => {
		vi.mocked(db.subscriber.findMany).mockResolvedValue([
			{ createdAt: day(1), confirmedAt: null, unsubscribedAt: null },
			{ createdAt: day(1), confirmedAt: day(2), unsubscribedAt: null },
			{ createdAt: day(1), confirmedAt: day(2), unsubscribedAt: null },
			{ createdAt: day(1), confirmedAt: day(2), unsubscribedAt: day(3) },
			{ createdAt: day(1), confirmedAt: null, unsubscribedAt: day(3) }
		] as never);

		expect(await getSubscriberCounts()).toEqual({ confirmed: 2, pending: 1, unsubscribed: 2 });
	});
});
