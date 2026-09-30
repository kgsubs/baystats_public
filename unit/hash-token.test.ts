import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hashToken } from '../src/lib/auth.ts';

// The admin check (admin-marinas.ts's verifyAdmin, marina-scrape.ts's
// verifyAdminFromCookie, src/lib/auth.ts's verifySession) all resolve a
// session cookie to a user by hashing the cookie value and looking it up
// in the sessions table. hashToken is the one piece of that chain with no
// database dependency, so it is what is unit-tested here; the lookup
// itself needs a live Supabase project.

test('hashToken returns a 64-character lowercase hex SHA-256 digest', () => {
  const hash = hashToken('a-sample-session-token');
  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('hashToken matches a plain SHA-256 computation', () => {
  const token = 'sb-access-token-value';
  const expected = createHash('sha256').update(token).digest('hex');
  assert.equal(hashToken(token), expected);
});

test('hashToken is deterministic: the same token always hashes the same way', () => {
  const token = 'repeat-me';
  assert.equal(hashToken(token), hashToken(token));
});

test('hashToken is not reversible-looking: different tokens hash differently', () => {
  assert.notEqual(hashToken('token-a'), hashToken('token-b'));
});

test('hashToken output never equals its plaintext input', () => {
  // The whole point of hashing: a database read of the sessions/magic_tokens
  // table should never recover the token a browser is holding.
  const token = 'sb-access-token-value';
  assert.notEqual(hashToken(token), token);
});
