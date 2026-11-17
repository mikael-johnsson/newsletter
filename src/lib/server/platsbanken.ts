const API_URL = 'https://jobsearch.api.jobtechdev.se';
const USER_AGENT = 'newsletter/0.1 (job ads for a personal newsletter)';
const TIMEOUT_MS = 10_000;

export const DEFAULT_QUERY = 'frontendutvecklare';
export const DEFAULT_LIMIT = 10;
export const MAX_OFFSET = 2000;

export interface JobAd {
	id: string;
	title: string;
	employer: string;
	location: string;
	occupation: string;
	// Swedish local time without a zone, exactly as the API returns it
	publishedAt: string;
	applicationDeadline: string;
	url: string;
}

interface Hit {
	id: string;
	headline: string;
	webpage_url?: string | null;
	employer?: { name?: string | null } | null;
	occupation?: { label?: string | null } | null;
	workplace_address?: {
		municipality?: string | null;
		city?: string | null;
		region?: string | null;
	} | null;
	publication_date?: string | null;
	application_deadline?: string | null;
}

export interface SearchResult {
	jobs: JobAd[];
	total: number;
}

export function buildSearchUrl(query: string, limit: number, offset = 0): URL {
	const url = new URL('/search', API_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('limit', String(limit));
	url.searchParams.set('offset', String(offset));
	return url;
}

function isHit(value: unknown): value is Hit {
	if (typeof value !== 'object' || value === null) return false;
	const hit = value as Record<string, unknown>;
	return typeof hit.id === 'string' && typeof hit.headline === 'string';
}

function toJobAd(hit: Hit): JobAd {
	const address = hit.workplace_address;
	return {
		id: hit.id,
		title: hit.headline.trim(),
		employer: hit.employer?.name?.trim() ?? '',
		location: address?.municipality ?? address?.city ?? address?.region ?? '',
		occupation: hit.occupation?.label ?? '',
		publishedAt: hit.publication_date ?? '',
		applicationDeadline: hit.application_deadline ?? '',
		url: hit.webpage_url ?? `https://arbetsformedlingen.se/platsbanken/annonser/${hit.id}`
	};
}

export function parseSearchResponse(json: unknown): SearchResult {
	const body = json as { hits?: unknown; total?: { value?: unknown } } | null;
	const hits = body?.hits;
	if (!Array.isArray(hits) || !hits.every(isHit)) {
		throw new Error('Unexpected response from the JobTech search API');
	}
	const total = body?.total?.value;
	return { jobs: hits.map(toJobAd), total: typeof total === 'number' ? total : hits.length };
}

function request(url: URL): Promise<Response> {
	return fetch(url, {
		headers: { accept: 'application/json', 'user-agent': USER_AGENT },
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
}

export async function searchJobAds({
	query = DEFAULT_QUERY,
	limit = DEFAULT_LIMIT,
	offset = 0
}: { query?: string; limit?: number; offset?: number } = {}): Promise<SearchResult> {
	const url = buildSearchUrl(query, limit, offset);
	const response = await request(url);
	if (!response.ok) {
		throw new Error(`JobTech search failed with status ${response.status}`);
	}
	return parseSearchResponse(await response.json());
}

export async function getJobAd(id: string): Promise<JobAd | null> {
	const response = await request(new URL(`/ad/${encodeURIComponent(id)}`, API_URL));
	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(`JobTech ad lookup failed with status ${response.status}`);
	}

	const json: unknown = await response.json();
	if (!isHit(json)) {
		throw new Error('Unexpected response from the JobTech ad API');
	}
	return toJobAd(json);
}
