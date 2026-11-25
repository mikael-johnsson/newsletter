import { parsePage } from '#lib/pagination.ts';
import { ISSUES_PER_PAGE, countSentIssues, listSentIssues } from '#lib/server/newsletters.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });

	const totalPages = Math.max(1, Math.ceil((await countSentIssues()) / ISSUES_PER_PAGE));
	const page = parsePage(url.searchParams.get('page'), totalPages);

	return { page, totalPages, issues: await listSentIssues(page) };
};
