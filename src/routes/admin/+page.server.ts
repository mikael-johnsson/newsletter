import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/session.ts';
import type { Actions } from './$types';
import { searchJobAds } from '#lib/server/platsbanken.ts';

export const actions = {
	logout: ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	},

	fetchJobs: async () => {
		try {
			return { jobs: await searchJobAds() };
		} catch (error) {
			console.error('[jobs] Platsbanken search failed', error);
			return fail(502, { jobsError: 'Kunde inte hämta jobb från Platsbanken. Försök igen.' });
		}
	}
} satisfies Actions;
