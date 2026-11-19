import { test, expect, login, account } from './helpers.js';
test('Firebase mode never offers demo identity switching or reset', async ({ page, members }) => {
  await login(page, members.alice);
  await expect(page.getByRole('heading', { name: 'Hola, Alice' })).toBeVisible();
  await expect(page.getByLabel('Perfil activo')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restablecer demo' })).toHaveCount(0);
  await page.getByRole('navigation').getByRole('link', { name: 'Tareas', exact: true }).click();
  await expect(page.getByText('Plan privado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByText('Plan privado')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Entrar como Álex' })).toHaveCount(0);
});
test('verified outsiders remain pending, without shared content', async ({ page, members }) => {
  const outsider = await account('outsider');
  await login(page, outsider);
  await expect(page.getByRole('heading', { name: 'Acceso pendiente' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByText('Plan privado')).toHaveCount(0);
});
test('wrong credentials keep the user signed out and do not echo the password', async ({ page, members }) => {
  await page.goto('/');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(members.alice.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Incorrect-secret-987');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('correo o la contraseña');
  await expect(page.getByRole('alert')).not.toContainText('Incorrect-secret-987');
  await expect(page.getByRole('navigation')).toHaveCount(0);
});
