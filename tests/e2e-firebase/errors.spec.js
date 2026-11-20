import { test, expect, login } from './helpers.js';
import { doc, updateDoc } from 'firebase/firestore';
test('a pending save cannot double-submit or announce success and a failed save retains form input', async ({ page, members }) => {
  await login(page, members.alice);
  await page.getByRole('navigation').getByRole('link', { name: 'Tareas', exact: true }).click();
  await page.evaluate(() => {
    const store = document.querySelector('marsito-app')._store; const original = store.dispatch.bind(store);
    window.savedCalls = 0;
    store.dispatch = (type, payload) => type !== 'task/add' ? original(type, payload) : (window.savedCalls++, new Promise((resolve, reject) => { window.failSave = () => reject(new Error('Se ha alcanzado la cuota de Firebase. Inténtalo más tarde.')); }));
  });
  await page.getByRole('button', { name: 'Nueva tarea' }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('No perder este texto'); await dialog.getByLabel('Tarea', { exact: true }).fill('Conservar al fallar');
  await dialog.getByRole('button', { name: 'Crear tarea' }).click();
  await expect(dialog).toBeVisible(); await expect(dialog.getByRole('button', { name: /Crear tarea|Guardando/ })).toBeDisabled();
  expect(await page.evaluate(() => window.savedCalls)).toBe(1);
  await expect(page.locator('#toast.visible')).toHaveCount(0);
  await page.evaluate(() => window.failSave());
  await expect(dialog.getByRole('alert')).toContainText('cuota');
  await expect(dialog.getByLabel('Título', { exact: true })).toHaveValue('No perder este texto');
});
test('offline actions show an error rather than pretending to save', async ({ page, context, members }) => {
  await login(page, members.alice); await page.getByRole('navigation').getByRole('link', { name: 'Tareas', exact: true }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Nueva tarea' }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('Sin conexión'); await dialog.getByLabel('Tarea', { exact: true }).fill('No debe guardarse'); await dialog.getByRole('button', { name: 'Crear tarea' }).click();
  await expect(dialog.getByRole('alert')).toContainText('conexión');
  await context.setOffline(false);
});
test('revocation closes an open detail and private content never returns from an old callback', async ({ page, members }) => {
  await login(page, members.alice); await page.getByRole('navigation').getByRole('link', { name: 'Tareas', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva tarea' }).click();
  await members.env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'betaMembers', members.alice.uid), { enabled: false }));
  await expect(page.getByRole('heading', { name: 'Acceso pendiente' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByText('Plan privado')).toHaveCount(0);
});
