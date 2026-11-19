import type { ComponentProps } from 'svelte';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

type Props = ComponentProps<typeof Page>;

function props(known: boolean, form: { unsubscribed: boolean } | null) {
	return { data: { known }, form } as unknown as Props;
}

describe('unsubscribe page', () => {
	it('asks before unsubscribing', async () => {
		const screen = await render(Page, props(true, null));

		await expect
			.element(screen.getByRole('button', { name: 'Avsluta prenumerationen' }))
			.toBeVisible();
		await expect.element(screen.getByText('Du får inga fler brev')).not.toBeInTheDocument();
	});

	it('confirms after the action', async () => {
		const screen = await render(Page, props(true, { unsubscribed: true }));

		await expect.element(screen.getByText('Du får inga fler brev')).toBeVisible();
		await expect.element(screen.getByRole('button')).not.toBeInTheDocument();
	});

	it('says an unknown link does not work', async () => {
		const screen = await render(Page, props(false, null));

		await expect.element(screen.getByText('Länken fungerar inte')).toBeVisible();
		await expect.element(screen.getByRole('button')).not.toBeInTheDocument();
	});
});
