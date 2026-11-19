import { db } from '#lib/server/db.ts';
import { unsubscribe } from '#lib/server/subscribe.ts';
import type { Actions, PageServerLoad } from './$types';

// Never unsubscribe here: link scanners open every URL in an email.
export const load: PageServerLoad = async ({ params }) => {
	const subscriber = await db.subscriber.findUnique({
		where: { unsubscribeToken: params.token },
		select: { id: true }
	});
	return { known: subscriber !== null };
};

// A default action, because one-click unsubscribe POSTs to the bare URL from the List-Unsubscribe header.
export const actions: Actions = {
	default: async ({ params }) => ({ unsubscribed: await unsubscribe(params.token) })
};
