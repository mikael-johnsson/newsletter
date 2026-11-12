import { XMLParser } from 'fast-xml-parser';

const USER_AGENT = 'newsletter/0.1 (articles for a personal newsletter)';
const TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MS = 15 * 60 * 1000;
const MAX_PER_SOURCE = 15;
const PAYWALL_CACHE_MS = 24 * 60 * 60 * 1000;
const SUMMARY_LENGTH = 280;

export interface Article {
	title: string;
	link: string;
	summary: string;
	source: string;
	publishedAt: string;
}

export interface ArticleGroup {
	source: string;
	articles: Article[];
}

export interface ArticleList {
	groups: ArticleGroup[];
	failedSources: string[];
}

interface Source {
	name: string;
	url: string;
	format: 'feed' | 'hackernews';
}

export const SOURCES: Source[] = [
	{
		name: 'Hacker News',
		url: 'https://hn.algolia.com/api/v1/search_by_date?query=junior%20developer&tags=story',
		format: 'hackernews'
	},
	{
		name: 'Hacker News',
		url: 'https://hn.algolia.com/api/v1/search_by_date?query=frontend&tags=story&numericFilters=points%3E50',
		format: 'hackernews'
	},
	{ name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', format: 'feed' },
	{ name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', format: 'feed' },
	{ name: 'Josh W. Comeau', url: 'https://www.joshwcomeau.com/rss.xml', format: 'feed' },
	{ name: 'Computer Sweden', url: 'https://computersweden.se/feed/', format: 'feed' },
	{ name: 'Breakit', url: 'https://www.breakit.se/feed/artiklar', format: 'feed' },
	{ name: 'Ny Teknik', url: 'https://www.nyteknik.se/?lab_viewport=rss', format: 'feed' }
];

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
		if (code[0] !== '#') return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
		const point =
			code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
		return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
	});
}

export function toPlainText(html: string): string {
	return decodeEntities(html.replace(/<[^>]*>/g, ' '))
		.replace(/\s+/g, ' ')
		.trim();
}

// Feed descriptions are often a whole article; the first paragraph is the lead.
function leadText(html: string): string {
	for (const [, paragraph] of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
		const text = toPlainText(paragraph);
		if (text) return text;
	}
	return toPlainText(html);
}

export function shorten(text: string, max = SUMMARY_LENGTH): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(' ');
	return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function httpUrl(value: string): string | null {
	try {
		const url = new URL(value.trim());
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
	} catch {
		return null;
	}
}

function isoDate(value: string): string | null {
	const time = Date.parse(value);
	return Number.isNaN(time) ? null : new Date(time).toISOString();
}

const xml = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	textNodeName: 'text',
	parseTagValue: false,
	isArray: (name) => name === 'item' || name === 'entry' || name === 'link'
});

type Node = Record<string, unknown>;

function text(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'object' && value !== null && 'text' in value) return text(value.text);
	return '';
}

function feedLink(links: unknown): string {
	if (!Array.isArray(links)) return '';
	for (const link of links) {
		if (typeof link === 'string') return link;
		const { href, rel } = (link ?? {}) as Node;
		if (typeof href === 'string' && (rel === undefined || rel === 'alternate')) return href;
	}
	return '';
}

export function parseFeed(body: string, source: string): Article[] {
	const document = xml.parse(body) as Node;
	const rss = document.rss as { channel?: { item?: Node[] } } | undefined;
	const atom = document.feed as { entry?: Node[] } | undefined;
	if (!rss?.channel && !atom) {
		throw new Error(`${source} did not return an RSS or Atom feed`);
	}

	return (rss?.channel?.item ?? atom?.entry ?? []).flatMap((item) => {
		const title = toPlainText(text(item.title));
		const link = httpUrl(feedLink(item.link));
		const publishedAt = isoDate(
			text(item.pubDate) || text(item.published) || text(item.updated) || text(item['dc:date'])
		);
		if (!title || !link || !publishedAt) return [];

		const body = text(item.description) || text(item.summary) || text(item.content);
		return [{ title, link, summary: shorten(leadText(body)), source, publishedAt }];
	});
}

export function parseHackerNews(json: unknown, source: string): Article[] {
	const hits = (json as { hits?: unknown } | null)?.hits;
	if (!Array.isArray(hits)) {
		throw new Error('Unexpected response from the Hacker News search API');
	}

	return hits.flatMap((hit: Node) => {
		const title = typeof hit.title === 'string' ? hit.title.trim() : '';
		const discussion = `https://news.ycombinator.com/item?id=${String(hit.objectID)}`;
		const link = httpUrl(typeof hit.url === 'string' ? hit.url : discussion);
		const publishedAt = typeof hit.created_at === 'string' ? isoDate(hit.created_at) : null;
		if (!title || !link || !publishedAt || hit.objectID === undefined) return [];
		return [{ title, link, summary: '', source, publishedAt }];
	});
}

async function fetchSource({ name, url, format }: Source): Promise<Article[]> {
	const response = await fetch(url, {
		headers: { 'user-agent': USER_AGENT },
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (!response.ok) {
		throw new Error(`${name} responded with status ${response.status}`);
	}
	return format === 'feed'
		? parseFeed(await response.text(), name)
		: parseHackerNews(await response.json(), name);
}

// Failed fetches are not cached, so they are retried on the next call.
const sourceCache = new Map<string, { fetchedAt: number; articles: Article[] }>();
const paywallCache = new Map<string, { checkedAt: number; paid: boolean }>();

export function clearArticleCache(): void {
	sourceCache.clear();
	paywallCache.clear();
}

async function cachedSource(source: Source, now: Date): Promise<Article[]> {
	const hit = sourceCache.get(source.url);
	if (hit && now.getTime() - hit.fetchedAt < CACHE_MS) return hit.articles;

	const articles = await fetchSource(source);
	sourceCache.set(source.url, { fetchedAt: now.getTime(), articles });
	return articles;
}

// Publishers mark paywalled pages with schema.org's isAccessibleForFree. Without it we cannot
// tell, so the article is kept.
const PAID_MARKER = /"isAccessibleForFree"\s*:\s*"?false"?/i;

async function isPaid(link: string, now: Date): Promise<boolean> {
	const hit = paywallCache.get(link);
	if (hit && now.getTime() - hit.checkedAt < PAYWALL_CACHE_MS) return hit.paid;

	try {
		const response = await fetch(link, {
			headers: { 'user-agent': USER_AGENT },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!response.ok) return false;
		const paid = PAID_MARKER.test(await response.text());
		paywallCache.set(link, { checkedAt: now.getTime(), paid });
		return paid;
	} catch (error) {
		console.warn(`[articles] Could not check the paywall for ${link}`, error);
		return false;
	}
}

async function withoutPaywall(articles: Article[], now: Date): Promise<Article[]> {
	const paid = await Promise.all(articles.map((article) => isPaid(article.link, now)));
	return articles.filter((_, index) => !paid[index]);
}

export async function fetchArticles(now = new Date()): Promise<ArticleList> {
	const results = await Promise.allSettled(SOURCES.map((source) => cachedSource(source, now)));
	const cutoff = now.getTime() - MAX_AGE_MS;
	const groups = new Map<string, Map<string, Article>>();
	const failedSources = new Set<string>();

	results.forEach((result, index) => {
		const { name } = SOURCES[index];
		if (result.status === 'rejected') {
			console.error(`[articles] Fetching ${name} failed`, result.reason);
			failedSources.add(name);
			return;
		}

		const group = groups.get(name) ?? new Map<string, Article>();
		for (const article of result.value) {
			if (Date.parse(article.publishedAt) >= cutoff && !group.has(article.link)) {
				group.set(article.link, article);
			}
		}
		groups.set(name, group);
	});

	const checked = await Promise.all(
		[...groups].map(async ([source, articles]) => ({
			source,
			articles: await withoutPaywall(
				[...articles.values()]
					.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
					.slice(0, MAX_PER_SOURCE),
				now
			)
		}))
	);

	return {
		groups: checked.filter(({ articles }) => articles.length > 0),
		failedSources: [...failedSources]
	};
}

export async function findArticle(link: string, now = new Date()): Promise<Article | null> {
	const { groups, failedSources } = await fetchArticles(now);
	const article = groups.flatMap(({ articles }) => articles).find((a) => a.link === link);
	if (!article && failedSources.length > 0) {
		throw new Error(`Article not found while ${failedSources.join(', ')} could not be fetched`);
	}
	return article ?? null;
}
