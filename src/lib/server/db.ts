import { PrismaNeon } from '@prisma/adapter-neon';
import { DATABASE_URL } from '$app/env/private';
import { PrismaClient } from './prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({ adapter: new PrismaNeon({ connectionString: DATABASE_URL }) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
