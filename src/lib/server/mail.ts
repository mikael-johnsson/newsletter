import { Resend } from 'resend';
import {
	MAIL_ALLOWLIST,
	MAIL_FROM,
	MAIL_SEND,
	MAIL_TEST_TO,
	RESEND_API_KEY
} from '$app/env/private';
import type { RenderedIssue } from './issue-email.ts';

export type Email = {
	to: string;
	subject: string;
	html: string;
	text: string;
	headers?: Record<string, string>;
	idempotencyKey?: string;
};

export type SendResult = 'sent' | 'logged';

let client: Resend | undefined;

function isAllowed(to: string): boolean {
	if (MAIL_SEND === 'all') return true;
	if (MAIL_SEND === 'allowlist') return MAIL_ALLOWLIST.includes(to.toLowerCase());
	return false;
}

function logNotSent(email: Email): void {
	console.info(
		`[mail] Not sent (MAIL_SEND=${MAIL_SEND}) to ${email.to}: ${email.subject}\n${email.text}`
	);
}

function getClient(): { client: Resend; from: string } {
	if (!RESEND_API_KEY || !MAIL_FROM) {
		throw new Error('MAIL_SEND is on, but RESEND_API_KEY or MAIL_FROM is missing');
	}
	client ??= new Resend(RESEND_API_KEY);
	return { client, from: MAIL_FROM };
}

async function send(email: Email): Promise<SendResult> {
	if (!isAllowed(email.to)) {
		logNotSent(email);
		return 'logged';
	}

	const { client, from } = getClient();
	const { to, subject, html, text, headers, idempotencyKey } = email;
	const { error } = await client.emails.send(
		{ from, to, subject, html, text, headers },
		idempotencyKey ? { idempotencyKey } : undefined
	);
	if (error) throw new Error(`Resend refused the email: ${error.name}: ${error.message}`);
	return 'sent';
}

export const BATCH_SIZE = 100;

// Resend's strict batch validation fails the whole call on one bad email, so a batch is never half sent.
export async function sendBatch(emails: Email[], idempotencyKey: string): Promise<number> {
	if (emails.length > BATCH_SIZE) throw new Error(`A batch holds at most ${BATCH_SIZE} emails`);

	const allowed = emails.filter((email) => isAllowed(email.to));
	emails.filter((email) => !isAllowed(email.to)).forEach(logNotSent);
	if (allowed.length === 0) return 0;

	const { client, from } = getClient();
	const { error } = await client.batch.send(
		allowed.map(({ to, subject, html, text, headers }) => ({
			from,
			to,
			subject,
			html,
			text,
			headers
		})),
		{ idempotencyKey }
	);
	if (error) throw new Error(`Resend refused the batch: ${error.name}: ${error.message}`);
	return allowed.length;
}

// No idempotency key: every click should send, so the author sees each change.
export async function sendTestIssue(
	issue: RenderedIssue
): Promise<{ to: string; result: SendResult }> {
	if (!MAIL_TEST_TO) throw new Error('MAIL_TEST_TO is not set');
	const result = await send({ ...issue, to: MAIL_TEST_TO, subject: `[TEST] ${issue.subject}` });
	return { to: MAIL_TEST_TO, result };
}

// The key repeats for the same confirm link, so resubmitting the form sends at most one email per 24 hours.
export async function sendConfirmation(to: string, confirmUrl: string): Promise<void> {
	await send({
		to,
		subject: 'Bekräfta din prenumeration på nyhetsbrevet Push to Main',
		text: [
			'Hej!',
			'',
			'Klicka på länken för att bekräfta att du vill få Push to Main en gång i veckan:',
			confirmUrl,
			'',
			'Har du inte anmält dig? Då kan du ignorera det här mejlet.'
		].join('\n'),
		html: `<!doctype html>
<html lang="sv">
<body style="margin:0;padding:24px;background:#FFF8EE;color:#141414;font-family:Inter,Arial,sans-serif;font-size:18px;line-height:1.5">
<p>Hej!</p>
<p>Klicka på knappen för att bekräfta att du vill få Push to Main en gång i veckan.</p>
<p><a href="${confirmUrl}" style="display:inline-block;padding:12px 20px;background:#FF4D2E;color:#141414;font-weight:700;text-decoration:none;border-radius:8px">Bekräfta prenumerationen</a></p>
<p style="color:#6B6459;font-size:15px">Har du inte anmält dig? Då kan du ignorera det här mejlet.</p>
</body>
</html>`,
		idempotencyKey: `confirm/${confirmUrl}`
	});
}
