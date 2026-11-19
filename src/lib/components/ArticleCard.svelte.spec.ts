import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Article } from '#lib/server/articles.ts';
import ArticleCard from './ArticleCard.svelte';

const article: Article = {
	title: 'Telias CIO: Så ska AI-agenter ta över utvecklingsarbetet',
	link: 'https://techtidningen.se/telias-cio-ai-agenter/',
	summary: 'AI-agenter ska skriva mer av koden.',
	source: 'Techtidningen',
	publishedAt: '2026-11-11T23:30:00.000Z'
};

describe('ArticleCard', () => {
	it('links the title to the article', async () => {
		const screen = await render(ArticleCard, { article });

		await expect
			.element(screen.getByRole('link', { name: article.title }))
			.toHaveAttribute('href', article.link);
	});

	it('shows the Swedish publish day for an article published late in the evening', async () => {
		const screen = await render(ArticleCard, { article });

		await expect.element(screen.getByText('12 nov.')).toBeInTheDocument();
	});

	it('sends only the link when adding, so the server looks the article up itself', async () => {
		const screen = await render(ArticleCard, { article });

		const fields = new FormData(screen.container.querySelector('form')!);
		expect([...fields.keys()]).toEqual(['link']);
		expect(fields.get('link')).toBe(article.link);
	});

	it('cannot add an article that is already in the newsletter', async () => {
		const screen = await render(ArticleCard, { article, added: true });

		await expect
			.element(screen.getByRole('button', { name: 'Tillagd i nyhetsbrevet' }))
			.toBeDisabled();
		expect(screen.container.querySelector('form')).toBeNull();
	});
});
