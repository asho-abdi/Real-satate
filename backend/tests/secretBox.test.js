import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, hashRecoveryCode } from '../src/utils/secretBox.js';

test('encrypt/decrypt round-trip', () => {
  const plain = 'JBSWY3DPEHPK3PXP';
  const enc = encryptSecret(plain);
  assert.notEqual(enc, plain);
  assert.equal(decryptSecret(enc), plain);
});

test('recovery code hashing is case-insensitive', () => {
  assert.equal(hashRecoveryCode('abcd1234'), hashRecoveryCode('ABCD1234'));
});
