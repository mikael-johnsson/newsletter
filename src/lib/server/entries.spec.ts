import { describe, expect, it } from 'vitest';
import { jobAdEntry, jobAdSummary } from './entries.ts';
import type { JobAd } from './platsbanken.ts';

const job: JobAd = {
	id: '31684195',
	title: 'Frontendutvecklare',
	employer: 'Adavo AB',
	location: 'Stockholm',
	occupation: 'Frontend-utvecklare',
	publishedAt: '2026-11-04T12:32:47',
	applicationDeadline: '2027-05-03T23:59:59',
	url: 'https://arbetsformedlingen.se/platsbanken/annonser/31684195'
};

describe('jobAdEntry', () => {
	it('turns a job ad into an AD entry that keeps all of its data', () => {
		expect(jobAdEntry(job, 2)).toEqual({
			type: 'AD',
			position: 2,
			title: 'Frontendutvecklare',
			link: 'https://arbetsformedlingen.se/platsbanken/annonser/31684195',
			summary: 'Frontend-utvecklare hos Adavo AB i Stockholm',
			source: 'Platsbanken',
			jobAd: {
				create: {
					platsbankenId: '31684195',
					employer: 'Adavo AB',
					location: 'Stockholm',
					occupation: 'Frontend-utvecklare',
					publishedAt: '2026-11-04T12:32:47',
					applicationDeadline: '2027-05-03T23:59:59'
				}
			}
		});
	});
});

describe('jobAdSummary', () => {
	it('leaves out the employer and location when the ad has none', () => {
		expect(jobAdSummary({ ...job, employer: '' })).toBe('Frontend-utvecklare i Stockholm');
		expect(jobAdSummary({ ...job, location: '' })).toBe('Frontend-utvecklare hos Adavo AB');
	});

	it('falls back to the job title when the occupation is missing', () => {
		expect(jobAdSummary({ ...job, occupation: '', employer: '', location: '' })).toBe(
			'Frontendutvecklare'
		);
	});
});
