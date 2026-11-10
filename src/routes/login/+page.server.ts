import { fail, redirect } from '@sveltejs/kit';
import { ADMIN_PASSWORD_HASH, SESSION_SECRET } from '$app/env/private';
import { verifyPassword } from '#lib/server/password.ts';
import {
	SESSION_COOKIE,
	SESSION_MAX_AGE_SECONDS,
	createSessionToken
} from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.isAdmin) redirect(303, '/admin');
};

export const actions = {
	default: async ({ request, cookies }) => {
		const password = (await request.formData()).get('password');

		if (typeof password !== 'string' || !(await verifyPassword(password, ADMIN_PASSWORD_HASH))) {
			return fail(400, { error: 'That password is not right.' });
		}

		cookies.set(SESSION_COOKIE, createSessionToken(SESSION_SECRET), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE_SECONDS
		});
		redirect(303, '/admin');
	}
} satisfies Actions;
