import type { ComponentProps } from 'svelte';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const job = {
	id: '31684195',
	title: 'Frontendutvecklare',
	employer: 'Adavo AB',
	location: 'Stockholm',
	occupation: 'Frontend-utvecklare',
	publishedAt: '2026-11-04T12:32:47',
	applicationDeadline: '2027-05-03T23:59:59',
	url: 'https://arbetsformedlingen.se/platsbanken/annonser/31684195'
};

const props = {
	data: {
		draft: { id: 'draft-1', subject: 'Nyhetsbrev vecka 47', entries: [] },
		jobs: [job],
		jobsError: null
	},
	form: null
} as unknown as ComponentProps<typeof Page>;

describe('admin content tabs', () => {
	it('shows the job ads by default', async () => {
		const screen = await render(Page, props);

		await expect
			.element(screen.getByRole('tab', { name: 'Jobs' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(screen.getByRole('link', { name: 'Frontendutvecklare' })).toBeVisible();
	});

	it('switches to articles and hides the job ads', async () => {
		const screen = await render(Page, props);

		await screen.getByRole('tab', { name: 'Articles' }).click();

		await expect.element(screen.getByText('No articles found')).toBeVisible();
		await expect
			.element(screen.getByRole('link', { name: 'Frontendutvecklare', includeHidden: true }))
			.not.toBeVisible();
	});

	it('moves between tabs with the arrow keys', async () => {
		const screen = await render(Page, props);
		const articles = screen.getByRole('tab', { name: 'Articles' });

		(screen.getByRole('tab', { name: 'Jobs' }).element() as HTMLElement).focus();
		await userEvent.keyboard('{ArrowRight}');

		await expect.element(articles).toHaveAttribute('aria-selected', 'true');
		await expect.element(articles).toHaveFocus();
	});
});
