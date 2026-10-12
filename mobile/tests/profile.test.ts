import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authErrorMessage, initials, isSessionExpired } from '../utils/profile.ts';

test('initials: two words, one word, email only, nothing', () => {
  assert.equal(initials({ display_name: 'Mario Rossi', email: null }), 'MR');
  assert.equal(initials({ display_name: 'Anna Maria De Luca', email: null }), 'AL');
  assert.equal(initials({ display_name: 'luca', email: null }), 'LU');
  assert.equal(initials({ display_name: null, email: 'zeta@example.com' }), 'ZE');
  assert.equal(initials({ display_name: '  ', email: null }), '?');
});

test('a session is expired at or just before its expiry, and when unparseable', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  assert.equal(isSessionExpired('2026-11-11T12:00:00Z', now), false);
  assert.equal(isSessionExpired('2026-10-12T12:00:30Z', now), true); // inside the 60 s margin
  assert.equal(isSessionExpired('2026-10-12T11:00:00Z', now), true);
  assert.equal(isSessionExpired('not a date', now), true);
});

test('error messages are friendly and a cancel is silent', () => {
  assert.equal(authErrorMessage({ code: 'SIGN_IN_CANCELLED' }), '');
  assert.match(authErrorMessage({ status: 503, code: 'auth_disabled' }), /non è ancora disponibile/);
  assert.match(authErrorMessage({ status: 401, code: 'invalid_google_token' }), /non riuscito/);
  assert.match(authErrorMessage(new TypeError('Network request failed')), /Connessione/);
  assert.doesNotMatch(authErrorMessage({ message: 'secret-token-abc' }), /secret-token/);
});
