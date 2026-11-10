import { confirmSubscription } from '#lib/server/subscribe.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	return { confirmed: await confirmSubscription(params.token) };
};
