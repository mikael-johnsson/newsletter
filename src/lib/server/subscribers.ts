import { db } from './db.ts';

export const SUBSCRIBERS_PER_PAGE = 50;

export type SubscriberStatus = 'confirmed' | 'pending' | 'bounced' | 'unsubscribed';

type Dates = {
	createdAt: Date;
	confirmedAt: Date | null;
	unsubscribedAt: Date | null;
	bouncedAt: Date | null;
};

const dates = {
	createdAt: true,
	confirmedAt: true,
	unsubscribedAt: true,
	bouncedAt: true
} as const;

// A bounced reader who has signed up again stays bounced until they confirm.
export function subscriberStatus(subscriber: Dates): { status: SubscriberStatus; since: Date } {
	if (subscriber.unsubscribedAt)
		return { status: 'unsubscribed', since: subscriber.unsubscribedAt };
	if (subscriber.bouncedAt) return { status: 'bounced', since: subscriber.bouncedAt };
	if (subscriber.confirmedAt) return { status: 'confirmed', since: subscriber.confirmedAt };
	return { status: 'pending', since: subscriber.createdAt };
}

// shortcut: loads every subscriber's dates to count them, switch to db.subscriber.count per status past ~50k rows.
export async function getSubscriberCounts(): Promise<Record<SubscriberStatus, number>> {
	const subscribers = await db.subscriber.findMany({ select: dates });
	const counts = { confirmed: 0, pending: 0, bounced: 0, unsubscribed: 0 };
	for (const subscriber of subscribers) counts[subscriberStatus(subscriber).status]++;
	return counts;
}

export async function listSubscribers(page: number) {
	const subscribers = await db.subscriber.findMany({
		select: { id: true, email: true, ...dates },
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		skip: (page - 1) * SUBSCRIBERS_PER_PAGE,
		take: SUBSCRIBERS_PER_PAGE
	});
	return subscribers.map(({ id, email, createdAt, ...dates }) => ({
		id,
		email,
		createdAt,
		...subscriberStatus({ createdAt, ...dates })
	}));
}
