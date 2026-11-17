import { beforeEach, describe, expect, it, vi } from 'vitest';

const { env, emailsSend } = vi.hoisted(() => ({
	env: {
		MAIL_SEND: 'off' as 'off' | 'allowlist' | 'all',
		MAIL_ALLOWLIST: [] as string[],
		MAIL_TEST_TO: 'delivered@resend.dev' as string | undefined,
		MAIL_FROM: 'Juniorens nyhetsbrev <onboarding@resend.dev>' as string | undefined,
		RESEND_API_KEY: 're_test' as string | undefined
	},
	emailsSend: vi.fn()
}));

vi.mock('$app/env/private', () => ({
	get MAIL_SEND() {
		return env.MAIL_SEND;
	},
	get MAIL_ALLOWLIST() {
		return env.MAIL_ALLOWLIST;
	},
	get MAIL_TEST_TO() {
		return env.MAIL_TEST_TO;
	},
	get MAIL_FROM() {
		return env.MAIL_FROM;
	},
	get RESEND_API_KEY() {
		return env.RESEND_API_KEY;
	}
}));

vi.mock('resend', () => ({
	Resend: class {
		emails = { send: emailsSend };
	}
}));

const { sendConfirmation, sendTestIssue } = await import('./mail.ts');

const to = 'delivered@resend.dev';
const confirmUrl = 'https://example.test/confirm/token-1';

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'info').mockImplementation(() => {});
	emailsSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
	Object.assign(env, {
		MAIL_SEND: 'all',
		MAIL_ALLOWLIST: [],
		MAIL_TEST_TO: 'delivered@resend.dev',
		MAIL_FROM: 'Juniorens nyhetsbrev <onboarding@resend.dev>',
		RESEND_API_KEY: 're_test'
	});
});

describe('sendConfirmation', () => {
	it('never calls Resend when MAIL_SEND is off', async () => {
		env.MAIL_SEND = 'off';

		await sendConfirmation(to, confirmUrl);

		expect(emailsSend).not.toHaveBeenCalled();
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining(confirmUrl));
	});

	it('only sends to allow-listed addresses when MAIL_SEND is allowlist', async () => {
		env.MAIL_SEND = 'allowlist';
		env.MAIL_ALLOWLIST = [to];

		await sendConfirmation('reader@example.se', confirmUrl);
		expect(emailsSend).not.toHaveBeenCalled();

		await sendConfirmation('Delivered@Resend.dev', confirmUrl);
		expect(emailsSend).toHaveBeenCalledOnce();
	});

	it('sends the confirm link with an idempotency key tied to that link', async () => {
		await sendConfirmation(to, confirmUrl);

		const [payload, options] = emailsSend.mock.calls[0];
		expect(payload).toMatchObject({ from: env.MAIL_FROM, to });
		expect(payload.html).toContain(confirmUrl);
		expect(payload.text).toContain(confirmUrl);
		expect(options).toEqual({ idempotencyKey: `confirm/${confirmUrl}` });
	});

	it('throws when Resend returns an error, since the SDK does not throw', async () => {
		emailsSend.mockResolvedValue({
			data: null,
			error: { name: 'validation_error', message: 'Invalid `to` field' }
		});

		await expect(sendConfirmation(to, confirmUrl)).rejects.toThrow('validation_error');
	});

	it('throws instead of sending when sending is on but the API key is missing', async () => {
		env.RESEND_API_KEY = undefined;

		await expect(sendConfirmation(to, confirmUrl)).rejects.toThrow('RESEND_API_KEY');
		expect(emailsSend).not.toHaveBeenCalled();
	});
});

describe('sendTestIssue', () => {
	const issue = {
		subject: 'Nyhetsbrev vecka 47',
		html: '<p>Hej</p>',
		text: 'Hej',
		headers: { 'List-Unsubscribe': '<https://example.test/unsubscribe/test>' }
	};

	it('sends only to MAIL_TEST_TO, marked as a test, with a fresh send on every click', async () => {
		const outcome = await sendTestIssue(issue);

		expect(outcome).toEqual({ to: 'delivered@resend.dev', result: 'sent' });
		const [payload, options] = emailsSend.mock.calls[0];
		expect(payload).toMatchObject({
			to: 'delivered@resend.dev',
			subject: '[TEST] Nyhetsbrev vecka 47',
			headers: issue.headers
		});
		expect(options).toBeUndefined();
	});

	it('still respects MAIL_SEND and reports that the email was only logged', async () => {
		env.MAIL_SEND = 'allowlist';
		env.MAIL_ALLOWLIST = ['someone-else@resend.dev'];

		expect(await sendTestIssue(issue)).toEqual({ to: 'delivered@resend.dev', result: 'logged' });
		expect(emailsSend).not.toHaveBeenCalled();
	});

	it('refuses to send when MAIL_TEST_TO is not set', async () => {
		env.MAIL_TEST_TO = undefined;

		await expect(sendTestIssue(issue)).rejects.toThrow('MAIL_TEST_TO');
		expect(emailsSend).not.toHaveBeenCalled();
	});
});
