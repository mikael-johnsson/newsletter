import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/session.ts';
import { addJobAdToDraft, getCurrentDraft, removeEntryFromDraft } from '#lib/server/newsletters.ts';
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
	const [draft, jobs] = await Promise.all([getCurrentDraft(), loadJobs()]);
	return { draft, ...jobs };
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
