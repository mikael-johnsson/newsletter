import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db.ts';
import { getJobAd, type JobAd } from './platsbanken.ts';
import {
	addJobAdToDraft,
	addOwnPostToDraft,
	draftSubject,
	getCurrentDraft,
	isoWeek,
	markSent,
	removeEntryFromDraft,
	type Draft
} from './newsletters.ts';

vi.mock('./db.ts', () => {
	const newsletter = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() };
	return {
		db: {
			newsletter,
			entry: { deleteMany: vi.fn() },
			$transaction: vi.fn((run: (tx: unknown) => unknown) => run({ newsletter }))
		}
	};
});
vi.mock('./platsbanken.ts', () => ({ getJobAd: vi.fn() }));

const findFirst = vi.mocked(db.newsletter.findFirst);
const create = vi.mocked(db.newsletter.create);
const update = vi.mocked(db.newsletter.update);
const deleteEntries = vi.mocked(db.entry.deleteMany);
const fetchAd = vi.mocked(getJobAd);

const job: JobAd = {
	id: '31684195',
	title: 'Frontendutvecklare',
	employer: 'Adavo AB',
	location: 'Stockholm',
	occupation: 'Frontend-utvecklare',
	publishedAt: '2026-11-04T12:32:47',
	applicationDeadline: '2027-05-03T23:59:59',
	url: 'https://arbetsformedlingen.se/platsbanken/annonser/31684195'
};

function draft(entries: { position: number; platsbankenId?: string }[] = []) {
	return {
		id: 'draft-1',
		subject: 'Nyhetsbrev vecka 47',
		status: 'DRAFT',
		entries: entries.map(({ position, platsbankenId }) => ({
			id: `entry-${position}`,
			position,
			jobAd: platsbankenId ? { platsbankenId } : null
		}))
	} as unknown as Draft;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('draftSubject', () => {
	it('names the draft after the week it goes out, the week after it is created', () => {
		expect(draftSubject(new Date('2026-11-10T12:00:00Z'))).toBe('Nyhetsbrev vecka 47');
	});

	it('rolls over into week 1 of the next year', () => {
		expect(draftSubject(new Date('2026-12-31T12:00:00Z'))).toBe('Nyhetsbrev vecka 1');
	});
});

describe('isoWeek', () => {
	it('puts early January in the previous year’s last week when the ISO calendar does', () => {
		expect(isoWeek(new Date('2021-01-01T12:00:00Z'))).toBe(53);
	});
});

describe('getCurrentDraft', () => {
	it('returns the existing draft', async () => {
		findFirst.mockResolvedValue(draft());

		expect(await getCurrentDraft()).toMatchObject({ id: 'draft-1' });
		expect(create).not.toHaveBeenCalled();
	});

	it('creates a draft when there is none', async () => {
		findFirst.mockResolvedValue(null);

		await getCurrentDraft(new Date('2026-11-10T12:00:00Z'));

		expect(create.mock.calls[0][0].data).toEqual({ subject: 'Nyhetsbrev vecka 47' });
	});
});

describe('addJobAdToDraft', () => {
	it('adds the ad after the last entry', async () => {
		findFirst.mockResolvedValue(draft([{ position: 0 }, { position: 1 }]));
		fetchAd.mockResolvedValue(job);

		expect(await addJobAdToDraft('31684195')).toBe('added');

		const { where, data } = update.mock.calls[0][0];
		expect(where).toEqual({ id: 'draft-1' });
		expect(data.entries).toMatchObject({
			create: { type: 'AD', position: 2, link: job.url, source: 'Platsbanken' }
		});
	});

	it('does not add the same ad twice', async () => {
		findFirst.mockResolvedValue(draft([{ position: 0, platsbankenId: '31684195' }]));

		expect(await addJobAdToDraft('31684195')).toBe('duplicate');
		expect(fetchAd).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});

	it('rejects an ad that no longer exists on Platsbanken', async () => {
		findFirst.mockResolvedValue(draft());
		fetchAd.mockResolvedValue(null);

		expect(await addJobAdToDraft('1')).toBe('not-found');
		expect(update).not.toHaveBeenCalled();
	});
});

describe('addOwnPostToDraft', () => {
	it('adds an own post last as a free-hand entry', async () => {
		findFirst.mockResolvedValue(draft([{ position: 0 }]));

		await addOwnPostToDraft({ title: 'Veckans tips', url: null, text: 'Hej!' });

		expect(update.mock.calls[0][0].data.entries).toEqual({
			create: {
				type: 'FREEHAND',
				position: 1,
				title: 'Veckans tips',
				link: null,
				summary: 'Hej!',
				source: 'Eget inlägg'
			}
		});
	});
});

describe('removeEntryFromDraft', () => {
	it('removes an entry only from a newsletter that is still a draft', async () => {
		deleteEntries.mockResolvedValue({ count: 1 });

		expect(await removeEntryFromDraft('entry-1')).toBe(true);
		expect(deleteEntries.mock.calls[0][0]).toEqual({
			where: { id: 'entry-1', newsletter: { status: 'DRAFT' } }
		});
	});

	it('reports nothing removed for an entry in a sent issue or an unknown id', async () => {
		deleteEntries.mockResolvedValue({ count: 0 });

		expect(await removeEntryFromDraft('sent-entry')).toBe(false);
	});
});

describe('markSent', () => {
	const now = new Date('2026-11-17T08:00:00Z');

	it('marks the newsletter sent and creates the next draft', async () => {
		findFirst.mockResolvedValue(null);

		await markSent('draft-1', now);

		expect(update.mock.calls[0][0]).toEqual({
			where: { id: 'draft-1' },
			data: { status: 'SENT', sentAt: now }
		});
		expect(create.mock.calls[0][0].data).toEqual({ subject: 'Nyhetsbrev vecka 48' });
	});

	it('does not create a second draft when one already exists', async () => {
		findFirst.mockResolvedValue(draft());

		await markSent('older-1', now);

		expect(create).not.toHaveBeenCalled();
	});
});
