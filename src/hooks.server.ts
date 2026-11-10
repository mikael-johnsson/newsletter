import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_SECRET } from '$app/env/private';
import { SESSION_COOKIE, isValidSession } from '#lib/server/session.ts';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.isAdmin = isValidSession(event.cookies.get(SESSION_COOKIE), SESSION_SECRET);

	if (event.url.pathname.startsWith('/admin') && !event.locals.isAdmin) {
		redirect(303, '/login');
	}

	return resolve(event);
};
