import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSearchUrl, getJobAd, parseSearchResponse, searchJobAds } from './platsbanken.ts';

const hit = {
	id: '31684195',
	headline: 'Frontendutvecklare',
	webpage_url: 'https://arbetsformedlingen.se/platsbanken/annonser/31684195',
	employer: { name: 'Adavo AB', workplace: 'Adavo AB' },
	occupation: { concept_id: 'GDHs_eoz_uKx', label: 'Frontend-utvecklare' },
	workplace_address: { municipality: 'Stockholm', region: 'Stockholms län', city: null },
	publication_date: '2026-11-04T12:32:47',
	application_deadline: '2027-05-03T23:59:59'
};

function stubFetch(response: Response) {
	const fetchMock = vi.fn().mockResolvedValue(response);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('buildSearchUrl', () => {
	it('encodes the query and limit', () => {
		expect(buildSearchUrl('frontend utvecklare', 10).toString()).toBe(
			'https://jobsearch.api.jobtechdev.se/search?q=frontend+utvecklare&limit=10'
		);
	});
});

describe('parseSearchResponse', () => {
	it('turns a hit into a job ad', () => {
		expect(parseSearchResponse({ hits: [hit] })).toEqual([
			{
				id: '31684195',
				title: 'Frontendutvecklare',
				employer: 'Adavo AB',
				location: 'Stockholm',
				occupation: 'Frontend-utvecklare',
				publishedAt: '2026-11-04T12:32:47',
				applicationDeadline: '2027-05-03T23:59:59',
				url: 'https://arbetsformedlingen.se/platsbanken/annonser/31684195'
			}
		]);
	});

	it('falls back to the region when the ad has no municipality', () => {
		const [ad] = parseSearchResponse({
			hits: [{ ...hit, workplace_address: { municipality: null, region: 'Skåne län' } }]
		});

		expect(ad.location).toBe('Skåne län');
	});

	it('keeps an ad with only an id and a title, and links it to Platsbanken', () => {
		const [ad] = parseSearchResponse({ hits: [{ id: '123', headline: 'Utvecklare' }] });

		expect(ad).toMatchObject({ employer: '', location: '', occupation: '' });
		expect(ad.url).toBe('https://arbetsformedlingen.se/platsbanken/annonser/123');
	});

	it('returns no ads for an empty search', () => {
		expect(parseSearchResponse({ total: { value: 0 }, hits: [] })).toEqual([]);
	});

	it('throws when the response shape has changed', () => {
		expect(() => parseSearchResponse({ results: [hit] })).toThrow(/Unexpected response/);
		expect(() => parseSearchResponse({ hits: [{ id: 1 }] })).toThrow(/Unexpected response/);
	});
});

describe('searchJobAds', () => {
	it('searches for 10 frontend ads by default', async () => {
		const fetchMock = stubFetch(Response.json({ hits: [hit] }));

		const ads = await searchJobAds();

		expect(fetchMock.mock.calls[0][0].toString()).toBe(
			'https://jobsearch.api.jobtechdev.se/search?q=frontendutvecklare&limit=10'
		);
		expect(ads).toHaveLength(1);
	});

	it('throws when the API answers with an error status', async () => {
		stubFetch(new Response('Service Unavailable', { status: 503 }));

		await expect(searchJobAds()).rejects.toThrow(/status 503/);
	});
});

describe('getJobAd', () => {
	it('looks up one ad by its Platsbanken id', async () => {
		const fetchMock = stubFetch(Response.json(hit));

		const ad = await getJobAd('31684195');

		expect(fetchMock.mock.calls[0][0].toString()).toBe(
			'https://jobsearch.api.jobtechdev.se/ad/31684195'
		);
		expect(ad).toMatchObject({ id: '31684195', title: 'Frontendutvecklare' });
	});

	it('returns null for an ad that no longer exists', async () => {
		stubFetch(new Response('Not found', { status: 404 }));

		expect(await getJobAd('1')).toBeNull();
	});
});
