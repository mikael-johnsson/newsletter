import { defineConfig } from 'prisma/config';

try {
	process.loadEnvFile();
} catch {
	// No local env file: rely on variables already in the environment (e.g. on Vercel).
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: { path: 'prisma/migrations' },
	datasource: { url: process.env.DIRECT_URL }
});
