import { fail } from '@sveltejs/kit';
import { isValidEmail, normalizeEmail, subscribe } from '#lib/server/subscribe.ts';
import type { Actions } from './$types';

export const actions = {
	subscribe: async ({ request, url }) => {
		const raw = (await request.formData()).get('email');
		const typed = typeof raw === 'string' ? raw : '';
		const email = normalizeEmail(typed);

		if (!isValidEmail(email)) {
			return fail(400, {
				email: typed,
				error: 'Skriv en hel e-postadress, till exempel namn@exempel.se.'
			});
		}

		try {
			await subscribe(email, url.origin);
		} catch (error) {
			console.error('Subscribe failed', error);
			return fail(500, { email: typed, error: 'Något gick fel. Försök igen om en stund.' });
		}

		return { success: true };
	}
} satisfies Actions;
