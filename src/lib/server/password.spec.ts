import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('verifyPassword', () => {
	it('accepts the password the hash was made from', async () => {
		const hash = await hashPassword('correct horse');
		expect(await verifyPassword('correct horse', hash)).toBe(true);
	});

	it('rejects a different password', async () => {
		const hash = await hashPassword('correct horse');
		expect(await verifyPassword('battery staple', hash)).toBe(false);
	});

	it('rejects a malformed hash instead of throwing', async () => {
		expect(await verifyPassword('anything', '')).toBe(false);
		expect(await verifyPassword('anything', 'scrypt.onlysalt')).toBe(false);
		expect(await verifyPassword('anything', 'bcrypt.abc.def')).toBe(false);
	});

	it('produces a hash without `$`, so env files do not mangle it', async () => {
		expect(await hashPassword('correct horse')).not.toContain('$');
	});
});
