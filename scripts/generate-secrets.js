import crypto from 'node:crypto';

function secret() {
  return crypto.randomBytes(48).toString('hex');
}

const access = secret();
const refresh = secret();
const adminPass = crypto.randomBytes(18).toString('base64url');

console.log('Paste these into backend/.env for production:\n');
console.log(`JWT_ACCESS_SECRET=${access}`);
console.log(`JWT_REFRESH_SECRET=${refresh}`);
console.log(`SEED_ADMIN_PASSWORD=${adminPass}`);
console.log('\nKeep these private. Do not commit them.');
