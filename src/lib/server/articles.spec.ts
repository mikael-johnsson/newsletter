import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	fetchArticles,
	findArticle,
	parseFeed,
	parseHackerNews,
	shorten,
	SOURCES,
	toPlainText
} from './articles.ts';

const NOW = new Date('2026-11-12T12:00:00Z');

function rss(items: string): string {
	return `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title><link>https://example.se</link>${items}</channel></rss>`;
}

const cssItem = `<item>
	<title>Taming Typography &amp; Resets</title>
	<link>https://css-tricks.com/taming-typography/</link>
	<pubDate>Tue, 10 Nov 2026 16:42:18 +0000</pubDate>
	<description><![CDATA[<p>A modern CSS reset, step by step.</p><hr /><p><small>Originally published on CSS-Tricks</small></p>]]></description>
</item>`;

describe('parseFeed', () => {
	it('turns an RSS item into an article with the lead paragraph as summary', () => {
		expect(parseFeed(rss(cssItem), 'CSS-Tricks')).toEqual([
			{
				title: 'Taming Typography & Resets',
				link: 'https://css-tricks.com/taming-typography/',
				summary: 'A modern CSS reset, step by step.',
				source: 'CSS-Tricks',
				publishedAt: '2026-11-10T16:42:18.000Z'
			}
		]);
	});

	it('reads Atom entries and their alternate link', () => {
		const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry>
			<title type="html">The Future of CSS</title>
			<link rel="self" href="https://blog.example/feed/1" />
			<link rel="alternate" href="https://blog.example/css-future/" />
			<published>2026-11-09T08:00:00Z</published>
			<summary>Interop 2027 is here.</summary>
		</entry></feed>`;

		expect(parseFeed(atom, 'Blog')).toEqual([
			{
				title: 'The Future of CSS',
				link: 'https://blog.example/css-future/',
				summary: 'Interop 2027 is here.',
				source: 'Blog',
				publishedAt: '2026-11-09T08:00:00.000Z'
			}
		]);
	});

	it('skips ad slots and items without a title, link or date', () => {
		const items = `
			<item><title><![CDATA[ ]]></title><link>https://www.nyteknik.se/annons</link><pubDate>Thu, 12 Nov 2026 06:00:00 +0100</pubDate></item>
			<item><title>No link</title><pubDate>Thu, 12 Nov 2026 06:00:00 +0100</pubDate></item>
			<item><title>No date</title><link>https://www.nyteknik.se/a/1</link></item>
			${cssItem}`;

		expect(parseFeed(rss(items), 'Ny Teknik').map((a) => a.title)).toEqual([
			'Taming Typography & Resets'
		]);
	});

	it('drops links that are not http or https', () => {
		const item = cssItem.replace(
			'https://css-tricks.com/taming-typography/',
			'javascript:alert(1)'
		);

		expect(parseFeed(rss(item), 'CSS-Tricks')).toEqual([]);
	});

	it('rejects a page that is not a feed', () => {
		expect(() => parseFeed('<html><body>Not found</body></html>', 'Ny Teknik')).toThrow(
			'Ny Teknik did not return an RSS or Atom feed'
		);
	});
});

describe('parseHackerNews', () => {
	it('links to the story, or to the discussion when the story has no url', () => {
		const articles = parseHackerNews(
			{
				hits: [
					{
						objectID: '1',
						title: 'Show HN: Modern web',
						url: 'https://example.com/web',
						created_at: '2026-11-11T10:00:00Z'
					},
					{
						objectID: '2',
						title: 'Ask HN: Junior roles?',
						url: null,
						created_at: '2026-11-11T09:00:00Z'
					}
				]
			},
			'Hacker News'
		);

		expect(articles.map((a) => a.link)).toEqual([
			'https://example.com/web',
			'https://news.ycombinator.com/item?id=2'
		]);
	});
});

describe('toPlainText and shorten', () => {
	it('strips tags and decodes entities', () => {
		expect(toPlainText('<p>Svenska&nbsp;<b>utvecklare</b> &amp; &#8217;AI&#x2019;</p>')).toBe(
			'Svenska utvecklare & ’AI’'
		);
	});

	it('cuts long text at a word boundary', () => {
		expect(shorten('Sedan ett tag tillbaka är det möjligt', 20)).toBe('Sedan ett tag…');
	});
});

describe('fetchArticles', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	function stubSources(responses: Record<string, () => Response>) {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				const source = SOURCES.find((s) => s.url === url);
				const empty =
					source?.format === 'hackernews' ? Response.json({ hits: [] }) : new Response(rss(''));
				return responses[source?.name ?? '']?.() ?? empty;
			})
		);
	}

	const oldItem = cssItem
		.replace('Taming Typography &amp; Resets', 'Old news')
		.replace('taming-typography', 'old-news')
		.replace('Tue, 10 Nov 2026', 'Mon, 02 Nov 2026');

	it('keeps the other sources when one fails', async () => {
		stubSources({
			'CSS-Tricks': () => new Response(rss(cssItem)),
			Breakit: () => new Response('Forbidden', { status: 403 })
		});

		const { groups, failedSources } = await fetchArticles(NOW);

		expect(groups.map((g) => g.source)).toEqual(['CSS-Tricks']);
		expect(failedSources).toEqual(['Breakit']);
	});

	it('only lists articles from the last seven days', async () => {
		stubSources({ 'CSS-Tricks': () => new Response(rss(oldItem + cssItem)) });

		const { groups } = await fetchArticles(NOW);

		expect(groups[0].articles.map((a) => a.title)).toEqual(['Taming Typography & Resets']);
	});

	it('merges both Hacker News searches into one group without duplicates', async () => {
		const story = {
			objectID: '1',
			title: 'Frontend for juniors',
			url: 'https://example.com/a',
			created_at: '2026-11-11T10:00:00Z'
		};
		stubSources({ 'Hacker News': () => Response.json({ hits: [story] }) });

		const { groups } = await fetchArticles(NOW);

		expect(groups).toEqual([
			{
				source: 'Hacker News',
				articles: [expect.objectContaining({ title: 'Frontend for juniors' })]
			}
		]);
	});
});

describe('findArticle', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('finds an article by link in the current feeds', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(rss(cssItem)))
		);

		const article = await findArticle('https://css-tricks.com/taming-typography/', NOW);

		expect(article?.title).toBe('Taming Typography & Resets');
	});

	it('fails instead of reporting "not found" when a source could not be fetched', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('', { status: 500 }))
		);

		await expect(findArticle('https://css-tricks.com/taming-typography/', NOW)).rejects.toThrow();
	});
});
