import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  adminErrorMessage,
  allRefreshFinal,
  canEditUser,
  cooldownMessage,
  formatItalianDate,
  formatItalianDateTime,
  hasPermission,
  isAdminUser,
  permissionLabel,
  overallProgress,
  refreshStateLabel,
  sportProgress,
  roleLabel,
  shouldKeepPolling,
} from '../utils/admin.ts';

test('role and admin checks', () => {
  assert.equal(isAdminUser({ role: 'admin' }), true);
  assert.equal(isAdminUser({ role: 'super_admin' }), true);
  assert.equal(isAdminUser({ role: 'user' }), false);
  assert.equal(isAdminUser({}), false);
  assert.equal(isAdminUser(null), false);
  assert.equal(roleLabel('super_admin'), 'Super admin');
  assert.equal(roleLabel('admin'), 'Admin');
  assert.equal(roleLabel('user'), 'Utente');
});

test('permissions: super admin has all, admin only granted, user none', () => {
  assert.equal(hasPermission({ role: 'super_admin', permissions: [] }, 'refresh_data'), true);
  assert.equal(hasPermission({ role: 'admin', permissions: ['view_users'] }, 'view_users'), true);
  assert.equal(hasPermission({ role: 'admin', permissions: ['view_users'] }, 'refresh_data'), false);
  assert.equal(hasPermission({ role: 'user', permissions: ['view_users'] }, 'view_users'), false);
  assert.equal(hasPermission(null, 'view_users'), false);
});

test('permission labels prefer the server text, then fallback, then the key', () => {
  assert.equal(permissionLabel('view_users', 'Vedi utenti'), 'Vedi utenti');
  assert.equal(permissionLabel('refresh_data'), 'Aggiornare i dati');
  assert.equal(permissionLabel('mystery'), 'mystery');
});

test('refresh state labels', () => {
  assert.equal(refreshStateLabel('queued'), 'In coda…');
  assert.equal(refreshStateLabel('running'), 'In corso…');
  assert.equal(refreshStateLabel('success'), 'Completato');
  assert.equal(refreshStateLabel('failed'), 'Errore');
  assert.equal(refreshStateLabel('error'), 'Errore');
  assert.equal(refreshStateLabel('unknown'), 'Stato non disponibile');
});

test('final state: only success/failed/unknown/error stop the polling', () => {
  assert.equal(allRefreshFinal({ football: 'success', tennis: 'failed' }), true);
  assert.equal(allRefreshFinal({ football: 'success', tennis: 'unknown' }), true);
  assert.equal(allRefreshFinal({ football: 'success', tennis: 'running' }), false);
  assert.equal(allRefreshFinal({ football: 'success', tennis: 'queued' }), false);
  assert.equal(allRefreshFinal({}), false);
});

test('polling stops when final or after 20 minutes', () => {
  const running = { football: 'running', tennis: 'queued' };
  assert.equal(shouldKeepPolling(running, 0, 5_000), true);
  assert.equal(shouldKeepPolling(running, 0, 1_199_999), true);
  assert.equal(shouldKeepPolling(running, 0, 1_200_000), false);
  assert.equal(shouldKeepPolling({ football: 'success', tennis: 'failed' }, 0, 1_000), false);
});

test('cooldown message', () => {
  assert.equal(cooldownMessage(42), 'Aggiornamento già avviato: riprova tra 42 secondi');
  assert.equal(cooldownMessage(1), 'Aggiornamento già avviato: riprova tra 1 secondo');
  assert.equal(cooldownMessage(0.2), 'Aggiornamento già avviato: riprova tra 1 secondo');
  assert.equal(cooldownMessage(undefined), 'Aggiornamento già avviato: riprova tra 60 secondi');
});

test('Italian dates in Rome time', () => {
  assert.match(formatItalianDate('2026-10-14T10:00:00Z'), /^14 ott/);
  assert.match(formatItalianDate('2026-10-14T10:00:00Z'), /2026$/);
  assert.equal(formatItalianDate(null), '—');
  assert.equal(formatItalianDate('boh'), '—');
  assert.match(formatItalianDateTime('2026-10-14T10:30:00Z'), /12:30$/); // CEST = UTC+2
  assert.equal(formatItalianDateTime(null), 'Mai');
});

test('admin error messages', () => {
  assert.equal(
    adminErrorMessage({ status: 429, retryAfterSeconds: 30 }),
    'Aggiornamento già avviato: riprova tra 30 secondi',
  );
  assert.match(adminErrorMessage({ status: 401 }), /Sessione scaduta/);
  assert.match(adminErrorMessage({ status: 403 }), /permesso/);
  assert.match(adminErrorMessage({ status: 409, code: 'self_change' }), /tuo stesso ruolo/);
  assert.match(adminErrorMessage({ status: 409, code: 'protected' }), /super admin/);
  assert.match(adminErrorMessage(new TypeError('Network request failed')), /Connessione/);
  assert.doesNotMatch(adminErrorMessage({ message: 'secret-token' }), /secret/);
});

test('only a super admin edits others, never super admins or themselves', () => {
  const me = { id: 'a', role: 'super_admin' };
  assert.equal(canEditUser(me, { id: 'b', role: 'user' }), true);
  assert.equal(canEditUser(me, { id: 'b', role: 'admin' }), true);
  assert.equal(canEditUser(me, { id: 'c', role: 'super_admin' }), false);
  assert.equal(canEditUser(me, { id: 'a', role: 'user' }), false);
  assert.equal(canEditUser({ id: 'a', role: 'admin' }, { id: 'b', role: 'user' }), false);
});

test('progress: finished runs count 100, others use the engine number', () => {
  assert.equal(sportProgress('running', 40.4), 40);
  assert.equal(sportProgress('queued', null), 0);
  assert.equal(sportProgress('success', null), 100);
  assert.equal(sportProgress('running', 250), 100);
  assert.equal(overallProgress({ football: 'running', tennis: 'success' }, { football: 50 }), 75);
  assert.equal(overallProgress({}, {}), null);
});
