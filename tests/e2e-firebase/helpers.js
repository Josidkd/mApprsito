import { test as base, expect } from '@playwright/test';
import { testEnvironment } from '../firebase/helpers.js';
import { seedSpace } from '../firebase/provision-fixture.js';
export const password = 'Example-Password-123!';
export async function account(prefix, verified = true) {
  const email = `${prefix}-${crypto.randomUUID()}@example.test`;
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  if (!response.ok) throw Error(await response.text()); const { localId: uid } = await response.json();
  if (verified) {
    const verifiedResponse = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: uid, emailVerified: true }) });
    if (!verifiedResponse.ok) throw Error(await verifiedResponse.text());
  }
  return { uid, email };
}
export async function guardNetwork(page) {
  await page.route('**/*', route => { const url = new URL(route.request().url()); if (['127.0.0.1', 'localhost'].includes(url.hostname)) route.continue(); else route.abort(); });
}
export const test = base.extend({
  members: async ({ page }, use) => {
    const env = await testEnvironment(); await env.clearFirestore();
    const alice = await account('alice'), bob = await account('bob');
    await seedSpace(env, { uidA: alice.uid, uidB: bob.uid });
    await guardNetwork(page);
    try { await use({ alice, bob, env }); } finally { await env.cleanup(); }
  }
});
export { expect };
export async function login(page, user) {
  await page.goto('/'); await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
