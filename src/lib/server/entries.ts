import type { JobAd } from './platsbanken.ts';
import type { Prisma } from './prisma/client';

export function jobAdSummary(job: JobAd): string {
	let summary = job.occupation || job.title;
	if (job.employer) summary += ` hos ${job.employer}`;
	if (job.location) summary += ` i ${job.location}`;
	return summary;
}

export function jobAdEntry(job: JobAd, position: number): Prisma.EntryCreateWithoutNewsletterInput {
	return {
		type: 'AD',
		position,
		title: job.title,
		link: job.url,
		summary: jobAdSummary(job),
		source: 'Platsbanken',
		jobAd: {
			create: {
				platsbankenId: job.id,
				employer: job.employer,
				location: job.location,
				occupation: job.occupation,
				publishedAt: job.publishedAt,
				applicationDeadline: job.applicationDeadline
			}
		}
	};
}
