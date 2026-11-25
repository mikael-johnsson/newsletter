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
		outgoing: null,
		jobs: [job],
		jobsQuery: 'frontendutvecklare',
		jobsPage: 1,
		jobsTotalPages: 1,
		jobsError: null,
		articles: Promise.resolve({
			groups: [
				{
					source: 'CSS-Tricks',
					articles: [
						{
							title: 'Taming Typography',
							link: 'https://css-tricks.com/taming-typography/',
							summary: 'A modern CSS reset.',
							source: 'CSS-Tricks',
							publishedAt: '2026-11-10T16:42:18.000Z'
						}
					]
				}
			],
			failedSources: []
		})
	},
	form: null
} as unknown as ComponentProps<typeof Page>;

describe('admin content tabs', () => {
	it('shows the job ads by default', async () => {
		const screen = await render(Page, props);

		await expect
			.element(screen.getByRole('tab', { name: 'Jobb' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(screen.getByRole('link', { name: 'Frontendutvecklare' })).toBeVisible();
	});

	it('shows the current job search and keeps it when paging', async () => {
		const screen = await render(Page, {
			...props,
			data: { ...props.data, jobsQuery: 'backend & devops', jobsPage: 2, jobsTotalPages: 5 }
		});

		await expect
			.element(screen.getByRole('searchbox', { name: 'Sök jobb' }))
			.toHaveValue('backend & devops');
		await expect
			.element(screen.getByRole('link', { name: 'Nästa' }))
			.toHaveAttribute('href', '/admin?q=backend+%26+devops&page=3');
	});

	it('switches to articles and hides the job ads', async () => {
		const screen = await render(Page, props);

		await screen.getByRole('tab', { name: 'Artiklar' }).click();

		await expect.element(screen.getByRole('link', { name: 'Taming Typography' })).toBeVisible();
		await expect
			.element(screen.getByRole('link', { name: 'Frontendutvecklare', includeHidden: true }))
			.not.toBeVisible();
	});

	it('moves between tabs with the arrow keys', async () => {
		const screen = await render(Page, props);
		const articles = screen.getByRole('tab', { name: 'Artiklar' });

		(screen.getByRole('tab', { name: 'Jobb' }).element() as HTMLElement).focus();
		await userEvent.keyboard('{ArrowRight}');

		await expect.element(articles).toHaveAttribute('aria-selected', 'true');
		await expect.element(articles).toHaveFocus();
	});

	it('wraps around from the first tab to Från redaktören', async () => {
		const screen = await render(Page, props);

		(screen.getByRole('tab', { name: 'Jobb' }).element() as HTMLElement).focus();
		await userEvent.keyboard('{ArrowLeft}');

		await expect
			.element(screen.getByRole('tab', { name: 'Från redaktören' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(screen.getByLabelText('Titel')).toBeVisible();
	});

	it('lists the articles it could fetch and names the feeds that failed', async () => {
		const screen = await render(Page, {
			...props,
			data: {
				...props.data,
				articles: props.data.articles.then((articles) => ({
					...articles,
					failedSources: ['Breakit']
				}))
			}
		});

		await screen.getByRole('tab', { name: 'Artiklar' }).click();

		await expect.element(screen.getByRole('alert')).toHaveTextContent('Kunde inte hämta: Breakit.');
		await expect.element(screen.getByRole('heading', { name: 'CSS-Tricks' })).toBeVisible();
	});
});

describe('admin test email', () => {
	it('cannot send a test of an empty draft', async () => {
		const screen = await render(Page, props);

		await expect.element(screen.getByRole('button', { name: 'Skicka testmejl' })).toBeDisabled();
	});

	it('shows where the test email went', async () => {
		const screen = await render(Page, {
			...props,
			data: {
				...props.data,
				draft: {
					...props.data.draft,
					entries: [
						{
							id: 'entry-1',
							type: 'FREEHAND',
							title: 'Hej läsare',
							link: null,
							summary: 'Välkommen.',
							source: 'Från redaktören',
							jobAd: null
						}
					]
				}
			},
			form: { testSent: 'Testmejl skickat till delivered@resend.dev.' }
		} as unknown as ComponentProps<typeof Page>);

		await expect.element(screen.getByRole('button', { name: 'Skicka testmejl' })).toBeEnabled();
		await expect
			.element(screen.getByRole('status'))
			.toHaveTextContent('Testmejl skickat till delivered@resend.dev.');
	});
});

describe('admin send to everyone', () => {
	const draftWithEntry = {
		id: 'draft-1',
		subject: 'Nyhetsbrev vecka 47',
		entries: [{ id: 'entry-0', type: 'FREEHAND', title: 'Veckans tips', link: null, jobAd: null }]
	};

	it('asks for confirmation before sending', async () => {
		const screen = await render(Page, {
			...props,
			data: { ...props.data, draft: draftWithEntry }
		} as ComponentProps<typeof Page>);

		await expect
			.element(screen.getByRole('button', { name: 'Ja, skicka till alla' }))
			.not.toBeInTheDocument();
		await screen.getByText('Skicka till alla', { exact: true }).click();
		await expect
			.element(screen.getByRole('button', { name: 'Ja, skicka till alla' }))
			.toBeVisible();
	});

	it('shows the issue on its way instead of the send button', async () => {
		const screen = await render(Page, {
			...props,
			data: {
				...props.data,
				draft: draftWithEntry,
				outgoing: { subject: 'Nyhetsbrev vecka 46', status: 'SENDING', _count: { deliveries: 200 } }
			}
		} as unknown as ComponentProps<typeof Page>);

		await expect
			.element(screen.getByText('Nyhetsbrev vecka 46 skickas nu, 200 klara.'))
			.toBeVisible();
		await expect
			.element(screen.getByText('Skicka till alla', { exact: true }))
			.not.toBeInTheDocument();
	});
});
