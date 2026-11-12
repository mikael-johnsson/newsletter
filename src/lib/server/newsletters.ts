import { findArticle } from './articles.ts';
import { db } from './db.ts';
import { articleEntry, jobAdEntry } from './entries.ts';
import type { OwnPost } from './own-post.ts';
import { getJobAd } from './platsbanken.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isoWeek(date: Date): number {
	const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
	const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
	return Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
}

// A draft goes out the week after it is created, so it is named after that week.
export function draftSubject(now: Date): string {
	return `Nyhetsbrev vecka ${isoWeek(new Date(now.getTime() + 7 * DAY_MS))}`;
}

const withEntries = {
	entries: { orderBy: { position: 'asc' }, include: { jobAd: true } }
} as const;

export async function getCurrentDraft(now = new Date()) {
	const draft = await db.newsletter.findFirst({
		where: { status: 'DRAFT' },
		orderBy: { createdAt: 'asc' },
		include: withEntries
	});
	return (
		draft ?? db.newsletter.create({ data: { subject: draftSubject(now) }, include: withEntries })
	);
}

export type Draft = Awaited<ReturnType<typeof getCurrentDraft>>;

function nextPosition(draft: Draft): number {
	return (draft.entries.at(-1)?.position ?? -1) + 1;
}

export type AddResult = 'added' | 'duplicate' | 'not-found';

export async function addJobAdToDraft(platsbankenId: string): Promise<AddResult> {
	const draft = await getCurrentDraft();
	if (draft.entries.some((entry) => entry.jobAd?.platsbankenId === platsbankenId)) {
		return 'duplicate';
	}

	const job = await getJobAd(platsbankenId);
	if (!job) return 'not-found';

	await db.newsletter.update({
		where: { id: draft.id },
		data: { entries: { create: jobAdEntry(job, nextPosition(draft)) } }
	});
	return 'added';
}

export async function addArticleToDraft(link: string): Promise<AddResult> {
	const draft = await getCurrentDraft();
	if (draft.entries.some((entry) => entry.type === 'ARTICLE' && entry.link === link)) {
		return 'duplicate';
	}

	const article = await findArticle(link);
	if (!article) return 'not-found';

	await db.newsletter.update({
		where: { id: draft.id },
		data: { entries: { create: articleEntry(article, nextPosition(draft)) } }
	});
	return 'added';
}

export async function addOwnPostToDraft(post: OwnPost): Promise<void> {
	const draft = await getCurrentDraft();
	await db.newsletter.update({
		where: { id: draft.id },
		data: {
			entries: {
				create: {
					type: 'FREEHAND',
					position: nextPosition(draft),
					title: post.title,
					link: post.url,
					summary: post.text,
					source: 'Eget inlägg'
				}
			}
		}
	});
}

export async function removeEntryFromDraft(entryId: string): Promise<boolean> {
	const { count } = await db.entry.deleteMany({
		where: { id: entryId, newsletter: { status: 'DRAFT' } }
	});
	return count > 0;
}

export async function markSent(id: string, now = new Date()): Promise<void> {
	await db.$transaction(async (tx) => {
		await tx.newsletter.update({ where: { id }, data: { status: 'SENT', sentAt: now } });
		const nextDraft = await tx.newsletter.findFirst({ where: { status: 'DRAFT' } });
		if (!nextDraft) {
			await tx.newsletter.create({ data: { subject: draftSubject(now) } });
		}
	});
}
