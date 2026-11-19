import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ResolvedPathname } from '$app/types';
import Pagination from './Pagination.svelte';

const props = { label: 'Sidor', href: (page: number) => `/admin?page=${page}` as ResolvedPathname };

describe('Pagination', () => {
	it('marks the current page and links to its neighbours', async () => {
		const screen = await render(Pagination, { ...props, page: 3, totalPages: 10 });

		await expect
			.element(screen.getByRole('link', { name: 'Sida 3' }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(screen.getByRole('link', { name: 'Föregående' }))
			.toHaveAttribute('href', '/admin?page=2');
		await expect
			.element(screen.getByRole('link', { name: 'Nästa' }))
			.toHaveAttribute('href', '/admin?page=4');
	});

	it('has no previous link on the first page and no next link on the last', async () => {
		const first = await render(Pagination, { ...props, page: 1, totalPages: 5 });
		expect(first.container.textContent).not.toContain('Föregående');
		first.unmount();

		const last = await render(Pagination, { ...props, page: 5, totalPages: 5 });
		expect(last.container.textContent).not.toContain('Nästa');
	});

	it('renders nothing when everything fits on one page', async () => {
		const screen = await render(Pagination, { ...props, page: 1, totalPages: 1 });

		expect(screen.container.querySelector('nav')).toBeNull();
	});
});
