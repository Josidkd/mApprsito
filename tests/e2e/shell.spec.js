import { test, expect } from '@playwright/test';
test('demo access, profile switching, logout and reload work without real credentials', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Sin contraseñas reales')).toBeVisible();
  await page.getByRole('button', { name: 'Entrar como Álex' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Álex' })).toBeVisible();
  await page.getByLabel('Perfil activo').selectOption('sam');
  await expect(page.getByRole('heading', { name: 'Hola, Sam' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hola, Sam' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar como Álex' })).toBeVisible();
});
test('registration configures a demo profile and reset confirms and restores the data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear perfil demo' }).click();
  await page.getByLabel('Tu nombre').fill('Mar');
  await page.getByRole('button', { name: 'Guardar y entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Mar' })).toBeVisible();
  await page.getByRole('button', { name: 'Restablecer demo' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Mar' })).toBeVisible();
  await page.getByRole('button', { name: 'Restablecer demo' }).click();
  await dialog.getByRole('button', { name: 'Sí, restablecer' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Álex' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restablecer demo' })).toBeFocused();
});
test('new login always opens the dashboard even after leaving another section', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como Álex' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Tareas', exact: true }).click();
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar como Sam' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Sam' })).toBeVisible();
  await expect(page).toHaveURL(/#inicio$/);
});
test('dialogs expose their title to assistive technology', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como Álex' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Tareas', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva tarea' }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Una cosa menos que recordar');
});
test('submitting a dialog returns keyboard focus after the view redraws', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como Álex' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Tareas', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva tarea' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('Foco de prueba');
  await dialog.getByLabel('Tarea', { exact: true }).fill('Volver al botón al guardar');
  await dialog.getByRole('button', { name: 'Crear tarea' }).click();
  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toBeFocused();
});
test('keyboard can enter the demo and local storage failures stay visible', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw Error('blocked'); } }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como Álex' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Hola, Álex' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('guardar');
});
