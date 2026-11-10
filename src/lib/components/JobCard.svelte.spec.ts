import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { JobAd } from '#lib/server/platsbanken.ts';
import JobCard from './JobCard.svelte';

const job: JobAd = {
	id: '31684195',
	title: 'Frontendutvecklare',
	employer: 'Adavo AB',
	location: 'Stockholm',
	occupation: 'Frontend-utvecklare',
	publishedAt: '2026-11-04T23:30:00',
	applicationDeadline: '2027-05-03T23:59:59',
	url: 'https://arbetsformedlingen.se/platsbanken/annonser/31684195'
};

describe('JobCard', () => {
	it('links the title to the ad on Platsbanken', async () => {
		const screen = await render(JobCard, { job });

		await expect
			.element(screen.getByRole('link', { name: 'Frontendutvecklare' }))
			.toHaveAttribute('href', job.url);
	});

	it('shows the Swedish publish day even late in the evening', async () => {
		const screen = await render(JobCard, { job });

		await expect.element(screen.getByText('4 nov.')).toBeInTheDocument();
	});

	it('offers to add an ad that is not in the newsletter yet', async () => {
		const screen = await render(JobCard, { job });

		await expect
			.element(screen.getByRole('button', { name: 'Lägg till i nyhetsbrev' }))
			.toBeEnabled();
	});

	it('cannot add an ad that is already in the newsletter', async () => {
		const screen = await render(JobCard, { job, added: true });

		await expect
			.element(screen.getByRole('button', { name: 'Tillagd i nyhetsbrevet' }))
			.toBeDisabled();
		expect(screen.container.querySelector('form')).toBeNull();
	});

	it('leaves out details the ad does not have', async () => {
		const screen = await render(JobCard, {
			job: { ...job, employer: '', occupation: '', applicationDeadline: '' }
		});

		await expect.element(screen.getByText('Stockholm', { exact: true })).toBeInTheDocument();
		expect(screen.container.textContent).not.toContain('·');
		expect(screen.container.textContent).not.toContain('Sista ansökan');
	});
});
