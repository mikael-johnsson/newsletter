import { describe, expect, it } from 'vitest';
import { renderIssue } from './issue-email.ts';

type Entry = Parameters<typeof renderIssue>[0]['entries'][number];

function entry(fields: Partial<Entry>): Entry {
	return {
		id: 'entry-1',
		newsletterId: 'draft-1',
		type: 'FREEHAND',
		position: 0,
		title: 'Titel',
		link: null,
		summary: 'Sammanfattning',
		source: 'Från redaktören',
		jobAd: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...fields
	};
}

const unsubscribeUrl = 'https://example.test/unsubscribe/token-1';

describe('renderIssue', () => {
	it('escapes HTML in entry text, since titles and summaries come from outside sources', () => {
		const { html } = renderIssue(
			{
				subject: 'Vecka 47',
				entries: [entry({ title: '<script>alert(1)</script>', summary: 'Tom & "Jerry"' })]
			},
			unsubscribeUrl
		);

		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(html).toContain('Tom &amp; &quot;Jerry&quot;');
	});

	it('keeps the entries in the order of the issue, in both HTML and text', () => {
		const { html, text } = renderIssue(
			{
				subject: 'Vecka 47',
				entries: [
					entry({ id: 'a', title: 'Först' }),
					entry({ id: 'b', title: 'Sedan' }),
					entry({ id: 'c', title: 'Sist' })
				]
			},
			unsubscribeUrl
		);

		for (const output of [html, text]) {
			expect(output.indexOf('Först')).toBeLessThan(output.indexOf('Sedan'));
			expect(output.indexOf('Sedan')).toBeLessThan(output.indexOf('Sist'));
		}
	});

	it('groups entries under Läsvärt!, Annonser and Annat... and leaves out empty sections', () => {
		const { html, text } = renderIssue(
			{
				subject: 'Vecka 47',
				entries: [
					entry({ id: 'a', type: 'FREEHAND', title: 'Veckans tips' }),
					entry({ id: 'b', type: 'ARTICLE', title: 'Artikel' })
				]
			},
			unsubscribeUrl
		);

		for (const output of [html, text]) {
			const order = ['Läsvärt!', 'Artikel', 'Annat...', 'Veckans tips'].map((s) =>
				output.indexOf(s)
			);
			expect(order.every((index, i) => index > (order[i - 1] ?? -1))).toBe(true);
			expect(output).not.toContain('Annonser');
		}
	});

	it('links only http and https addresses', () => {
		const { html } = renderIssue(
			{
				subject: 'Vecka 47',
				entries: [
					entry({ id: 'a', title: 'Bra', link: 'https://example.test/a' }),
					entry({ id: 'b', title: 'Farlig', link: 'javascript:alert(1)' })
				]
			},
			unsubscribeUrl
		);

		expect(html).toContain('href="https://example.test/a"');
		expect(html).not.toContain('javascript:');
	});

	it('shows employer, location and the deadline on the same day Platsbanken gave', () => {
		const { html, text } = renderIssue(
			{
				subject: 'Vecka 47',
				entries: [
					entry({
						type: 'AD',
						jobAd: {
							id: 'job-1',
							entryId: 'entry-1',
							platsbankenId: '31684195',
							employer: 'Adavo AB',
							location: 'Stockholm',
							occupation: 'Frontend-utvecklare',
							publishedAt: '2026-11-04T12:32:47',
							applicationDeadline: '2027-05-03T23:59:59'
						}
					})
				]
			},
			unsubscribeUrl
		);

		expect(html).toContain('Adavo AB · Stockholm · Sök senast 3 maj');
		expect(text).toContain('Adavo AB · Stockholm · Sök senast 3 maj');
	});

	it("adds the reader's unsubscribe link to the footer, the text and the one-click headers", () => {
		const { html, text, headers } = renderIssue(
			{ subject: 'Vecka 47', entries: [entry({})] },
			unsubscribeUrl
		);

		expect(html).toContain(`href="${unsubscribeUrl}"`);
		expect(text).toContain(unsubscribeUrl);
		expect(headers).toEqual({
			'List-Unsubscribe': `<${unsubscribeUrl}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		});
	});
});
