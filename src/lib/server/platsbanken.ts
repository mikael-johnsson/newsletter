const SEARCH_URL = 'https://jobsearch.api.jobtechdev.se/search';
const USER_AGENT = 'newsletter/0.1 (job ads for a personal newsletter)';
const TIMEOUT_MS = 10_000;

export const DEFAULT_QUERY = 'frontendutvecklare';
export const DEFAULT_LIMIT = 10;

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

export function buildSearchUrl(query: string, limit: number): URL {
	const url = new URL(SEARCH_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('limit', String(limit));
	return url;
}

function isHit(value: unknown): value is Hit {
	if (typeof value !== 'object' || value === null) return false;
	const hit = value as Record<string, unknown>;
	return typeof hit.id === 'string' && typeof hit.headline === 'string';
}

export function parseSearchResponse(json: unknown): JobAd[] {
	const hits = (json as { hits?: unknown } | null)?.hits;
	if (!Array.isArray(hits) || !hits.every(isHit)) {
		throw new Error('Unexpected response from the JobTech search API');
	}

	return hits.map((hit) => {
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
	});
}

export async function searchJobAds({
	query = DEFAULT_QUERY,
	limit = DEFAULT_LIMIT
}: { query?: string; limit?: number } = {}): Promise<JobAd[]> {
	const url = buildSearchUrl(query, limit);
	const response = await fetch(url, {
		headers: { accept: 'application/json', 'user-agent': USER_AGENT },
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (!response.ok) {
		throw new Error(`JobTech search failed with status ${response.status}`);
	}
	return parseSearchResponse(await response.json());
}
