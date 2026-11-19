import { hashPassword } from '../src/lib/server/password.ts';

const password = process.env.ADMIN_PASSWORD;

if (!password) {
	console.error("Set ADMIN_PASSWORD first, e.g.  ADMIN_PASSWORD='…' npm run admin:hash");
	process.exit(1);
}

console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(password)}`);
