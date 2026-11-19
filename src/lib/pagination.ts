export type PageItem = number | 'gap';

export function parsePage(value: string | null, maxPage: number): number {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 ? Math.min(page, maxPage) : 1;
}

export function pageRange(current: number, total: number): PageItem[] {
	const shown = [...new Set([1, current - 1, current, current + 1, total])]
		.filter((page) => page >= 1 && page <= total)
		.sort((a, b) => a - b);

	const items: PageItem[] = [];
	let previous = 0;
	for (const page of shown) {
		if (page - previous === 2) items.push(previous + 1);
		else if (page - previous > 2) items.push('gap');
		items.push(page);
		previous = page;
	}
	return items;
}
