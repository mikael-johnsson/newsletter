import { createHash } from 'node:crypto';
import { db } from './db.ts';
import { renderIssue } from './issue-email.ts';
import { BATCH_SIZE, sendBatch } from './mail.ts';
import { getCurrentDraft, markSent, withEntries, type Draft } from './newsletters.ts';

type Issue = Pick<Draft, 'id' | 'subject' | 'entries'>;

export async function scheduleDraft(now = new Date()): Promise<'scheduled' | 'empty'> {
	const draft = await getCurrentDraft(now);
	if (draft.entries.length === 0) return 'empty';

	await db.newsletter.update({
		where: { id: draft.id, status: 'DRAFT' },
		data: { status: 'SCHEDULED', scheduledFor: now }
	});
	return 'scheduled';
}

export async function getOutgoingIssue() {
	return db.newsletter.findFirst({
		where: { status: { in: ['SCHEDULED', 'SENDING'] } },
		orderBy: { scheduledFor: 'asc' },
		select: { subject: true, status: true, _count: { select: { deliveries: true } } }
	});
}

// One conditional update, so overlapping runs can't both claim the same issue.
export async function claimDueIssues(now = new Date()): Promise<void> {
	await db.newsletter.updateMany({
		where: { status: 'SCHEDULED', scheduledFor: { lte: now } },
		data: { status: 'SENDING' }
	});
}

// Resend keys are at most 256 characters, so the reader ids are hashed.
export function batchKey(newsletterId: string, subscriberIds: string[]): string {
	const readers = createHash('sha256').update(subscriberIds.toSorted().join(',')).digest('hex');
	return `issue/${newsletterId}/${readers}`;
}

export async function sendNextBatch(
	issue: Issue,
	origin: string
): Promise<{ done: boolean; sent: number }> {
	// Ordered by id, so a run retried after a crash picks the same readers and repeats the same key.
	const readers = await db.subscriber.findMany({
		where: {
			confirmedAt: { not: null },
			unsubscribedAt: null,
			bouncedAt: null,
			deliveries: { none: { newsletterId: issue.id } }
		},
		orderBy: { id: 'asc' },
		take: BATCH_SIZE,
		select: { id: true, email: true, unsubscribeToken: true }
	});

	if (readers.length === 0) {
		await markSent(issue.id);
		return { done: true, sent: 0 };
	}

	const emails = readers.map((reader) => ({
		...renderIssue(issue, `${origin}/unsubscribe/${reader.unsubscribeToken}`),
		to: reader.email
	}));
	const ids = readers.map((reader) => reader.id);
	const sent = await sendBatch(emails, batchKey(issue.id, ids));

	// Readers MAIL_SEND only logged get a row too, or the issue would never finish.
	await db.delivery.createMany({
		data: ids.map((subscriberId) => ({ newsletterId: issue.id, subscriberId })),
		skipDuplicates: true
	});
	return { done: false, sent };
}

export async function runSend(origin: string, deadline: number, now = new Date()): Promise<number> {
	await claimDueIssues(now);
	const issues = await db.newsletter.findMany({
		where: { status: 'SENDING' },
		include: withEntries
	});

	let sent = 0;
	for (const issue of issues) {
		while (Date.now() < deadline) {
			const batch = await sendNextBatch(issue, origin);
			sent += batch.sent;
			if (batch.done) break;
		}
	}
	return sent;
}
