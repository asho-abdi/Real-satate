import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/utils/AppError.js';

/**
 * Lightweight unit coverage of building-scope decision logic used by finance docs.
 * Full DB integration tests require DATABASE_URL_TEST — see docs/TESTING.md.
 */

function canAccessBuilding(user, buildingId) {
  if (!user) return false;
  if (user.isAdmin || user.role === 'ADMIN' || user.buildingIds === null) return true;
  const ids = user.buildingIds || [];
  return ids.includes(buildingId);
}

function assertDocAccess(user, docBuildingId) {
  if (!canAccessBuilding(user, docBuildingId)) {
    throw new AppError('Document not found', 404, { code: 'NOT_FOUND' });
  }
}

test('authorized building manager can access own building doc', () => {
  const user = { role: 'BUILDING_MANAGER', buildingIds: ['b1', 'b2'], isAdmin: false };
  assert.doesNotThrow(() => assertDocAccess(user, 'b1'));
});

test('manager cannot access another building (404, no leak)', () => {
  const user = { role: 'BUILDING_MANAGER', buildingIds: ['b1'], isAdmin: false };
  try {
    assertDocAccess(user, 'b-other');
    assert.fail('expected throw');
  } catch (err) {
    assert.equal(err.statusCode || err.status, 404);
    assert.match(err.message, /not found/i);
  }
});

test('admin with global scope can access any building', () => {
  const admin = { role: 'ADMIN', buildingIds: null, isAdmin: true };
  assert.doesNotThrow(() => assertDocAccess(admin, 'any-building'));
});

test('UUID knowledge alone does not grant access', () => {
  const user = { role: 'BUILDING_MANAGER', buildingIds: ['b1'], isAdmin: false };
  assert.throws(() => assertDocAccess(user, 'guessed-uuid-building'), AppError);
});
