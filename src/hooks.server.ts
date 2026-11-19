import { redirect, text } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_SECRET } from '$app/env/private';
import { isForbiddenCrossSiteRequest } from '#lib/server/csrf.ts';
import { SESSION_COOKIE, isValidSession } from '#lib/server/session.ts';

export const handle: Handle = async ({ event, resolve }) => {
	if (isForbiddenCrossSiteRequest(event.request, event.url)) {
		return text(`Cross-site ${event.request.method} form submissions are forbidden`, {
			status: 403
		});
	}

	event.locals.isAdmin = isValidSession(event.cookies.get(SESSION_COOKIE), SESSION_SECRET);

	if (event.url.pathname.startsWith('/admin') && !event.locals.isAdmin) {
		redirect(303, '/login');
	}

	return resolve(event);
};
