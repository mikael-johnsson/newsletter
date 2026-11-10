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
	}
});
