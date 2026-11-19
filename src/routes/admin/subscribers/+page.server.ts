import { parsePage } from '#lib/pagination.ts';
import {
	SUBSCRIBERS_PER_PAGE,
	getSubscriberCounts,
	listSubscribers
} from '#lib/server/subscribers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });

	const counts = await getSubscriberCounts();
	const total = counts.confirmed + counts.pending + counts.unsubscribed;
	const totalPages = Math.max(1, Math.ceil(total / SUBSCRIBERS_PER_PAGE));
	const page = parsePage(url.searchParams.get('page'), totalPages);

	return { counts, page, totalPages, subscribers: await listSubscribers(page) };
};
