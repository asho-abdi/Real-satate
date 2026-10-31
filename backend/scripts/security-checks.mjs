/**
 * Offline security unit checks (no DB / no live server required).
 * Run: node backend/scripts/security-checks.mjs
 */
import assert from 'node:assert/strict';
import { validatePasswordStrength } from '../src/utils/passwordPolicy.js';
import {
  normalizeAllowedPages,
  permissionsFromPages,
  PAGE_PERMISSIONS,
} from '../src/constants/pageAccess.js';
import { detectType } from '../src/utils/fileMagic.js';

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(`      ${err.message}`);
    process.exitCode = 1;
  }
}

check('rejects weak passwords', () => {
  assert.equal(validatePasswordStrength('short').ok, false);
  assert.equal(validatePasswordStrength('password123').ok, false);
  assert.equal(validatePasswordStrength('NoNumber!aaa').ok, false);
  assert.equal(validatePasswordStrength('GoodPass1!').ok, true);
});

check('page access expands only known pages', () => {
  const pages = normalizeAllowedPages(['maintenance', 'hacked', 'payments']);
  assert.deepEqual(pages.sort(), ['maintenance', 'payments'].sort());
  const perms = permissionsFromPages(pages);
  assert.ok(perms.includes('maintenance:read'));
  assert.ok(perms.includes('payments:create'));
  assert.ok(!perms.includes('users:delete'));
});

check('maintenance-only user cannot get users permissions', () => {
  const perms = new Set(permissionsFromPages(['maintenance']));
  assert.ok(perms.has('maintenance:update'));
  assert.ok(!perms.has('users:create'));
  assert.ok(!perms.has('roles:update'));
  assert.ok(!perms.has('settings:update'));
});

check('every staff page has a permission map', () => {
  for (const key of Object.keys(PAGE_PERMISSIONS)) {
    assert.ok(Array.isArray(PAGE_PERMISSIONS[key]) && PAGE_PERMISSIONS[key].length > 0);
  }
});

check('magic bytes detect jpeg/png/pdf', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
  const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(detectType(jpeg), 'jpeg');
  assert.equal(detectType(png), 'png');
  assert.equal(detectType(pdf), 'pdf');
});

console.log(`\n${passed} checks completed`);
if (!process.exitCode) console.log('All security unit checks passed.');
