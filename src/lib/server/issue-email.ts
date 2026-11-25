import { colors, fonts } from '../design.ts';
import type { Draft } from './newsletters.ts';

type Issue = Pick<Draft, 'subject' | 'entries'>;
type Entry = Issue['entries'][number];

const sections: { type: Entry['type']; heading: string }[] = [
	{ type: 'ARTICLE', heading: 'Läsvärt!' },
	{ type: 'AD', heading: 'Annonser' },
	{ type: 'FREEHAND', heading: 'Annat...' }
];

export type RenderedIssue = {
	subject: string;
	html: string;
	text: string;
	headers: Record<string, string>;
};

const dateFormat = new Intl.DateTimeFormat('sv-SE', {
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});

// Platsbanken sends Swedish local time without a zone; formatting it as UTC keeps the day unchanged.
function formatDate(value: string): string {
	const date = new Date(`${value}Z`);
	return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function safeLink(link: string | null): string | null {
	if (!link || !URL.canParse(link)) return null;
	const { protocol } = new URL(link);
	return protocol === 'http:' || protocol === 'https:' ? link : null;
}

function jobDetails(entry: Entry): string {
	if (!entry.jobAd) return '';
	const { employer, location, applicationDeadline } = entry.jobAd;
	const deadline = formatDate(applicationDeadline);
	return [employer, location, deadline && `Sök senast ${deadline}`].filter(Boolean).join(' · ');
}

function entryHtml(entry: Entry): string {
	const link = safeLink(entry.link);
	const title = escapeHtml(entry.title);
	const heading = link
		? `<a href="${escapeHtml(link)}" style="color:${colors.ink};text-decoration:underline">${title}</a>`
		: title;
	const details = jobDetails(entry);

	return `<tr><td style="padding:0 0 32px">
<h3 style="margin:0 0 8px;font-family:${fonts.display};font-size:24px;line-height:1.25;color:${colors.ink}">${heading}</h3>
${details ? `<p style="margin:0 0 8px;font-weight:700">${escapeHtml(details)}</p>` : ''}
<p style="margin:0 0 8px">${escapeHtml(entry.summary).replaceAll('\n', '<br>')}</p>
<p style="margin:0;color:${colors.muted};font-size:15px">${escapeHtml(entry.source)}</p>
</td></tr>`;
}

function entryText(entry: Entry): string {
	return [entry.title, jobDetails(entry), entry.summary, safeLink(entry.link), entry.source]
		.filter(Boolean)
		.join('\n');
}

function sectionHtml(heading: string, entries: Entry[]): string {
	return `<tr><td style="padding:0 0 24px">
<h2 style="margin:0;font-family:${fonts.display};font-size:28px;line-height:1.2">${escapeHtml(heading)}</h2>
<div style="margin-top:12px;height:4px;width:48px;background:${colors.primary}"></div>
</td></tr>
${entries.map(entryHtml).join('\n')}`;
}

function sectionText(heading: string, entries: Entry[]): string {
	return [`## ${heading}`, ...entries.map(entryText)].join('\n\n');
}

export function renderIssue(issue: Issue, unsubscribeUrl: string): RenderedIssue {
	const subject = issue.subject;
	const unsubscribe = escapeHtml(unsubscribeUrl);
	const grouped = sections
		.map(({ type, heading }) => ({
			heading,
			entries: issue.entries.filter((entry) => entry.type === type)
		}))
		.filter(({ entries }) => entries.length > 0);

	const html = `<!doctype html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${colors.paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.paper}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;color:${colors.ink};font-family:${fonts.sans};font-size:18px;line-height:1.5">
<tr><td style="padding:0 0 32px">
<p style="margin:0 0 8px;color:${colors.muted};font-size:15px">Nyhetsbrevet Push to Main</p>
<h1 style="margin:0;font-family:${fonts.display};font-size:32px;line-height:1.2">${escapeHtml(subject)}</h1>
<div style="margin-top:16px;height:4px;width:64px;background:${colors.primary}"></div>
</td></tr>
${grouped.map(({ heading, entries }) => sectionHtml(heading, entries)).join('\n')}
<tr><td style="padding:16px 0 0;border-top:1px solid ${colors.muted};color:${colors.muted};font-size:15px">
Du får det här brevet för att du prenumererar på Push to Main.
<a href="${unsubscribe}" style="color:${colors.muted}">Avsluta prenumerationen</a>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

	const text = [
		subject,
		'',
		...grouped
			.map(({ heading, entries }) => sectionText(heading, entries))
			.join('\n\n')
			.split('\n'),
		'',
		'---',
		'Du får det här brevet för att du prenumererar på Push to Main.',
		`Avsluta prenumerationen: ${unsubscribeUrl}`
	].join('\n');

	return {
		subject,
		html,
		text,
		headers: {
			'List-Unsubscribe': `<${unsubscribeUrl}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		}
	};
}
