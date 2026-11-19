import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OwnPostForm from './OwnPostForm.svelte';

describe('OwnPostForm preview', () => {
	it('shows the title as plain text when no link is given', async () => {
		const screen = await render(OwnPostForm, {});

		await screen.getByLabelText('Titel').fill('Veckans tips');
		await screen.getByLabelText('Text').fill('Rad ett\nRad två');

		const preview = screen.getByRole('article', { name: 'Förhandsvisning' });
		await expect.element(preview.getByRole('heading', { name: 'Veckans tips' })).toBeVisible();
		expect(preview.getByRole('link').elements()).toHaveLength(0);
	});

	it('turns the title into a link once a URL is given', async () => {
		const screen = await render(OwnPostForm, {});

		await screen.getByLabelText('Titel').fill('Veckans tips');
		await screen.getByLabelText('Länk (valfri)').fill('https://example.se/tips');

		await expect
			.element(screen.getByRole('link', { name: 'Veckans tips' }))
			.toHaveAttribute('href', 'https://example.se/tips');
	});

	it('never links to a javascript: URL in the preview', async () => {
		const screen = await render(OwnPostForm, {});

		await screen.getByLabelText('Titel').fill('Tips');
		await screen.getByLabelText('Länk (valfri)').fill('javascript:alert(1)');

		expect(screen.getByRole('link').elements()).toHaveLength(0);
	});

	it('keeps typed values and shows the error after a failed submit', async () => {
		const screen = await render(OwnPostForm, {
			values: { title: '', url: '', text: 'Hej!' },
			errors: { title: 'Skriv en titel.' }
		});

		await expect.element(screen.getByText('Skriv en titel.')).toBeVisible();
		await expect.element(screen.getByLabelText('Text')).toHaveValue('Hej!');
		await expect.element(screen.getByLabelText('Titel')).toHaveAttribute('aria-invalid', 'true');
	});
});
