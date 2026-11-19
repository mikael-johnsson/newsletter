import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db.ts';
import { sendBatch } from './mail.ts';
import { getCurrentDraft, markSent, type Draft } from './newsletters.ts';
import { batchKey, claimDueIssues, runSend, scheduleDraft, sendNextBatch } from './send-issue.ts';

vi.mock('./db.ts', () => ({
	db: {
		newsletter: { update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
		subscriber: { findMany: vi.fn() },
		delivery: { createMany: vi.fn() }
	}
}));
vi.mock('./mail.ts', () => ({ BATCH_SIZE: 100, sendBatch: vi.fn() }));
vi.mock('./newsletters.ts', () => ({
	getCurrentDraft: vi.fn(),
	markSent: vi.fn(),
	withEntries: {}
}));

const findReaders = vi.mocked(db.subscriber.findMany);
const createDeliveries = vi.mocked(db.delivery.createMany);
const send = vi.mocked(sendBatch);

const issue = { id: 'issue-1', subject: 'Nyhetsbrev vecka 48', entries: [] } as unknown as Draft;
const origin = 'https://example.test';
const reader = (id: string) => ({ id, email: `${id}@example.se`, unsubscribeToken: `token-${id}` });

beforeEach(() => {
	vi.clearAllMocks();
	send.mockResolvedValue(0);
});

describe('scheduleDraft', () => {
	it('refuses an empty draft', async () => {
		vi.mocked(getCurrentDraft).mockResolvedValue({ ...issue, entries: [] } as unknown as Draft);

		expect(await scheduleDraft()).toBe('empty');
		expect(db.newsletter.update).not.toHaveBeenCalled();
	});

	it('schedules the draft for now, only while it is still a draft', async () => {
		vi.mocked(getCurrentDraft).mockResolvedValue({ ...issue, entries: [{}] } as unknown as Draft);
		const now = new Date('2026-11-18T10:00:00Z');

		expect(await scheduleDraft(now)).toBe('scheduled');
		expect(vi.mocked(db.newsletter.update).mock.calls[0][0]).toEqual({
			where: { id: 'issue-1', status: 'DRAFT' },
			data: { status: 'SCHEDULED', scheduledFor: now }
		});
	});
});

describe('claimDueIssues', () => {
	it('only claims scheduled issues that are due', async () => {
		const now = new Date('2026-11-18T10:00:00Z');

		await claimDueIssues(now);

		expect(vi.mocked(db.newsletter.updateMany).mock.calls[0][0]).toEqual({
			where: { status: 'SCHEDULED', scheduledFor: { lte: now } },
			data: { status: 'SENDING' }
		});
	});
});

describe('batchKey', () => {
	it('is the same for the same readers in any order, and differs per issue', () => {
		expect(batchKey('issue-1', ['b', 'a'])).toBe(batchKey('issue-1', ['a', 'b']));
		expect(batchKey('issue-2', ['a', 'b'])).not.toBe(batchKey('issue-1', ['a', 'b']));
	});

	it('stays within Resend’s 256-character limit for a full batch', () => {
		const ids = Array.from({ length: 100 }, (_, i) => `cm${String(i).padStart(23, '0')}`);
		expect(batchKey('cmissue0000000000000000000', ids).length).toBeLessThanOrEqual(256);
	});
});

describe('sendNextBatch', () => {
	it('picks the next 100 confirmed, subscribed readers without a delivery, in id order', async () => {
		findReaders.mockResolvedValue([reader('a')] as never);

		await sendNextBatch(issue, origin);

		expect(findReaders.mock.calls[0][0]).toMatchObject({
			where: {
				confirmedAt: { not: null },
				unsubscribedAt: null,
				deliveries: { none: { newsletterId: 'issue-1' } }
			},
			orderBy: { id: 'asc' },
			take: 100
		});
	});

	it('gives each reader their own unsubscribe link and records a delivery for each', async () => {
		findReaders.mockResolvedValue([reader('a'), reader('b')] as never);

		expect(await sendNextBatch(issue, origin)).toMatchObject({ done: false });

		const [emails, key] = send.mock.calls[0];
		expect(emails.map((email) => [email.to, email.headers?.['List-Unsubscribe']])).toEqual([
			['a@example.se', `<${origin}/unsubscribe/token-a>`],
			['b@example.se', `<${origin}/unsubscribe/token-b>`]
		]);
		expect(key).toBe(batchKey('issue-1', ['a', 'b']));
		expect(createDeliveries.mock.calls[0][0]).toEqual({
			data: [
				{ newsletterId: 'issue-1', subscriberId: 'a' },
				{ newsletterId: 'issue-1', subscriberId: 'b' }
			],
			skipDuplicates: true
		});
	});

	it('records no deliveries when the send fails, so the next run retries them', async () => {
		findReaders.mockResolvedValue([reader('a')] as never);
		send.mockRejectedValue(new Error('Resend refused the batch'));

		await expect(sendNextBatch(issue, origin)).rejects.toThrow();
		expect(createDeliveries).not.toHaveBeenCalled();
	});

	it('marks the issue sent when no readers are left', async () => {
		findReaders.mockResolvedValue([]);

		expect(await sendNextBatch(issue, origin)).toEqual({ done: true, sent: 0 });
		expect(markSent).toHaveBeenCalledWith('issue-1');
		expect(send).not.toHaveBeenCalled();
	});
});

describe('runSend', () => {
	it('keeps sending batches until the issue is done', async () => {
		vi.mocked(db.newsletter.findMany).mockResolvedValue([issue] as never);
		findReaders
			.mockResolvedValueOnce([reader('a')] as never)
			.mockResolvedValueOnce([reader('b')] as never)
			.mockResolvedValueOnce([]);
		send.mockResolvedValue(1);

		expect(await runSend(origin, Date.now() + 10_000)).toBe(2);
		expect(markSent).toHaveBeenCalledWith('issue-1');
	});

	it('stops at the deadline and leaves the rest for the next run', async () => {
		vi.mocked(db.newsletter.findMany).mockResolvedValue([issue] as never);

		expect(await runSend(origin, Date.now() - 1)).toBe(0);
		expect(findReaders).not.toHaveBeenCalled();
	});
});
