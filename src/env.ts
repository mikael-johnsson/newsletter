import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Neon pooled connection string used by the app at runtime'
	},
	ADMIN_PASSWORD_HASH: {
		description: 'scrypt hash of the author password; generate with `npm run admin:hash`'
	},
	SESSION_SECRET: {
		description: 'Random string that signs the admin session cookie; changing it logs everyone out'
	},
	MAIL_SEND: {
		description: 'Who gets real email: `off` (default, only logs), `allowlist` or `all`',
		schema: (value) => {
			const mode = value || 'off';
			if (mode !== 'off' && mode !== 'allowlist' && mode !== 'all') {
				throw new Error(`MAIL_SEND must be off, allowlist or all, got "${value}"`);
			}
			return mode;
		}
	},
	MAIL_ALLOWLIST: {
		description: 'Comma-separated addresses that get real email when MAIL_SEND=allowlist',
		schema: (value) =>
			(value ?? '')
				.split(',')
				.map((address) => address.trim().toLowerCase())
				.filter(Boolean)
	},
	MAIL_FROM: {
		description:
			'Sender, e.g. `Juniorens nyhetsbrev <onboarding@resend.dev>`; needed unless MAIL_SEND=off',
		schema: (value) => value || undefined
	},
	RESEND_API_KEY: {
		description: 'Resend API key (sending access is enough); needed unless MAIL_SEND=off',
		schema: (value) => value || undefined
	}
});
