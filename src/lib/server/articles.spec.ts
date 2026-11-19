import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clearArticleCache,
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
		clearArticleCache();
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

	it('shows only the 15 newest articles per source', async () => {
		const items = Array.from({ length: 20 }, (_, day) =>
			cssItem
				.replace('Taming Typography &amp; Resets', `Article ${day}`)
				.replace('taming-typography', `article-${day}`)
				.replace(
					'Tue, 10 Nov 2026 16:42:18',
					`Tue, 10 Nov 2026 ${String(day).padStart(2, '0')}:00:00`
				)
		).join('');
		stubSources({ 'CSS-Tricks': () => new Response(rss(items)) });

		const { groups } = await fetchArticles(NOW);

		expect(groups[0].articles.map((a) => a.title)).toEqual(
			Array.from({ length: 15 }, (_, i) => `Article ${19 - i}`)
		);
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

describe('article cache', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		clearArticleCache();
	});

	const minutesLater = (minutes: number) => new Date(NOW.getTime() + minutes * 60 * 1000);

	function stubFetch(failing: string[] = []) {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchMock = vi.fn(async (url: string) => {
			const source = SOURCES.find((s) => s.url === url);
			if (failing.includes(source?.name ?? '')) return new Response('', { status: 500 });
			return source?.format === 'hackernews'
				? Response.json({ hits: [] })
				: new Response(rss(source?.name === 'CSS-Tricks' ? cssItem : ''));
		});
		vi.stubGlobal('fetch', fetchMock);
		return fetchMock;
	}

	it('reuses fetched sources for 15 minutes, then fetches them again', async () => {
		const fetchMock = stubFetch();

		await fetchArticles(NOW);
		await fetchArticles(minutesLater(14));
		expect(fetchMock).toHaveBeenCalledTimes(SOURCES.length + 1);

		await fetchArticles(minutesLater(15));
		expect(fetchMock).toHaveBeenCalledTimes(SOURCES.length * 2 + 1);
	});

	it('retries a source that failed instead of caching the failure', async () => {
		const fetchMock = stubFetch(['Breakit']);

		await fetchArticles(NOW);
		const { failedSources } = await fetchArticles(minutesLater(1));

		expect(failedSources).toEqual(['Breakit']);
		expect(fetchMock).toHaveBeenCalledTimes(SOURCES.length + 2);
	});

	it('finds an article from the listed feeds without fetching them again', async () => {
		const fetchMock = stubFetch();

		await fetchArticles(NOW);
		const article = await findArticle('https://css-tricks.com/taming-typography/', minutesLater(1));

		expect(article?.title).toBe('Taming Typography & Resets');
		expect(fetchMock).toHaveBeenCalledTimes(SOURCES.length + 1);
	});
});

describe('paywall filter', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		clearArticleCache();
	});

	const freeLink = 'https://css-tricks.com/taming-typography/';
	const paidLink = 'https://css-tricks.com/paid-article/';
	const twoItems =
		cssItem + cssItem.replace('Taming Typography &amp; Resets', 'Paid').replace(freeLink, paidLink);
	const page = (accessible: string) =>
		new Response(
			`<html><script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":${accessible}}</script></html>`
		);

	function stubPages(pages: Record<string, () => Response>) {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const fetchMock = vi.fn(async (url: string) => {
			if (pages[url]) return pages[url]();
			const source = SOURCES.find((s) => s.url === url);
			if (source?.name === 'CSS-Tricks') return new Response(rss(twoItems));
			return source?.format === 'hackernews' ? Response.json({ hits: [] }) : new Response(rss(''));
		});
		vi.stubGlobal('fetch', fetchMock);
		return fetchMock;
	}

	const titles = async (now = NOW) =>
		(await fetchArticles(now)).groups.flatMap(({ articles }) => articles.map((a) => a.title));

	it('drops articles whose page says they are not free', async () => {
		stubPages({ [paidLink]: () => page('false'), [freeLink]: () => page('true') });

		expect(await titles()).toEqual(['Taming Typography & Resets']);
	});

	it('keeps articles whose page has no marker or cannot be loaded', async () => {
		stubPages({
			[freeLink]: () => new Response('<html></html>'),
			[paidLink]: () => {
				throw new TypeError('fetch failed');
			}
		});

		expect(await titles()).toEqual(['Taming Typography & Resets', 'Paid']);
	});

	it('does not check the same article page again within a day', async () => {
		const fetchMock = stubPages({ [paidLink]: () => page('false') });

		await titles();
		await titles(new Date(NOW.getTime() + 60 * 60 * 1000));

		expect(fetchMock.mock.calls.filter(([url]) => url === paidLink)).toHaveLength(1);
	});
});

describe('findArticle', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		clearArticleCache();
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
