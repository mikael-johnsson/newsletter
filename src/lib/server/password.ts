import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
	password: string,
	salt: Buffer,
	keyLength: number
) => Promise<Buffer>;

const PREFIX = 'scrypt';
const KEY_LENGTH = 64;

// Dot-separated base64url so the hash contains no `$`, which Vite expands inside env files.
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const hash = await scryptAsync(password, salt, KEY_LENGTH);
	return [PREFIX, salt.toString('base64url'), hash.toString('base64url')].join('.');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const parts = storedHash.split('.');
	if (parts.length !== 3 || parts[0] !== PREFIX) return false;

	const salt = Buffer.from(parts[1], 'base64url');
	const expected = Buffer.from(parts[2], 'base64url');
	if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;

	const actual = await scryptAsync(password, salt, KEY_LENGTH);
	return timingSafeEqual(actual, expected);
}
