import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/session.ts';
import type { Actions } from './$types';
import { searchJobAds } from '#lib/server/platsbanken.ts';

export const actions = {
	logout: ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/');
	},

	fetchJobs: async () => {
		const jobs = await searchJobAds();
		jobs.forEach((j) => console.log('Job: ', j));
	}
} satisfies Actions;
