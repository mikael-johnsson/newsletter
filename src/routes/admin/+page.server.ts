import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/session.ts';
import { fetchArticles } from '#lib/server/articles.ts';
import {
	addArticleToDraft,
	addJobAdToDraft,
	addOwnPostToDraft,
	getCurrentDraft,
	removeEntryFromDraft
} from '#lib/server/newsletters.ts';
import { parseOwnPost } from '#lib/server/own-post.ts';
import { searchJobAds, type JobAd } from '#lib/server/platsbanken.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadJobs(): Promise<{ jobs: JobAd[]; jobsError: string | null }> {
	try {
		return { jobs: await searchJobAds(), jobsError: null };
	} catch (error) {
		console.error('[jobs] Platsbanken search failed', error);
		return { jobs: [], jobsError: 'Kunde inte hämta jobb från Platsbanken. Ladda om sidan.' };
	}
}

export const load: PageServerLoad = async () => {
	const [draft, jobs, articles] = await Promise.all([
		getCurrentDraft(),
		loadJobs(),
		fetchArticles()
	]);
	return { draft, ...jobs, articles };
};

export const actions = {
	logout: ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	},

	addJob: async ({ request }) => {
		const platsbankenId = (await request.formData()).get('platsbankenId');
		if (typeof platsbankenId !== 'string' || !/^\d+$/.test(platsbankenId)) {
			return fail(400, { addError: 'Ogiltig annons.' });
		}

		try {
			const result = await addJobAdToDraft(platsbankenId);
			if (result === 'not-found') {
				return fail(404, { addError: 'Annonsen finns inte längre på Platsbanken.' });
			}
		} catch (error) {
			console.error('[newsletter] Adding job ad failed', error);
			return fail(502, { addError: 'Kunde inte lägga till annonsen. Försök igen.' });
		}
	},

	addArticle: async ({ request }) => {
		const link = (await request.formData()).get('link');
		if (typeof link !== 'string' || !URL.canParse(link) || link.length > 2048) {
			return fail(400, { addError: 'Ogiltig artikel.' });
		}

		try {
			const result = await addArticleToDraft(link);
			if (result === 'not-found') {
				return fail(404, { addError: 'Artikeln finns inte längre i flödet.' });
			}
		} catch (error) {
			console.error('[newsletter] Adding article failed', error);
			return fail(502, { addError: 'Kunde inte lägga till artikeln. Försök igen.' });
		}
	},

	addOwnPost: async ({ request }) => {
		const parsed = parseOwnPost(await request.formData());
		if (!('post' in parsed)) return fail(400, { ownPost: parsed });

		try {
			await addOwnPostToDraft(parsed.post);
		} catch (error) {
			console.error('[newsletter] Adding own post failed', error);
			const { title, url, text } = parsed.post;
			return fail(502, {
				ownPost: {
					values: { title, url: url ?? '', text },
					errors: { form: 'Kunde inte lägga till inlägget. Försök igen.' }
				}
			});
		}
	},

	removeEntry: async ({ request }) => {
		const entryId = (await request.formData()).get('entryId');
		if (typeof entryId !== 'string' || !/^[a-z0-9]{1,64}$/i.test(entryId)) {
			return fail(400, { removeError: 'Ogiltigt inlägg.' });
		}

		try {
			if (!(await removeEntryFromDraft(entryId))) {
				return fail(404, { removeError: 'Inlägget finns inte i utkastet.' });
			}
		} catch (error) {
			console.error('[newsletter] Removing entry failed', error);
			return fail(502, { removeError: 'Kunde inte ta bort inlägget. Försök igen.' });
		}
	}
} satisfies Actions;
