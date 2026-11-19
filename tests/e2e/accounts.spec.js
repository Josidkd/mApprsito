import { test, expect } from '@playwright/test';
import { enter, assertFits } from './helpers.js';
test('expense cycles split the difference, confirm settlement and persist history', async ({ page }) => {
  await enter(page, 'cuentas');
  await page.getByRole('button', { name: 'Liquidar', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('No se realiza ningún pago real');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByText('La compra de la semana', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Liquidar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar liquidación' }).click();
  await expect(page.getByRole('button', { name: 'Liquidar', exact: true })).toBeDisabled();
  for (const [profile, concept, amount] of [['alex', 'Compra de prueba', '30'], ['sam', 'Pan de prueba', '10']]) {
    await page.getByLabel('Perfil activo').selectOption(profile);
    await page.getByRole('button', { name: 'Añadir gasto' }).click();
    await dialog.getByLabel('Concepto').fill(concept);
    await dialog.getByLabel('Importe (€)').fill(amount);
    await dialog.getByRole('button', { name: 'Guardar gasto' }).click();
  }
  await expect(page.getByTestId('balance-transfer')).toContainText('Sam debe a Álex');
  await expect(page.getByTestId('balance-transfer')).toContainText('10,00');
  await page.getByRole('button', { name: 'Liquidar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar liquidación' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Liquidar', exact: true })).toBeDisabled();
  await expect(page.getByText('Un ciclo nuevo, las cuentas a cero')).toBeVisible();
  await expect(page.getByTestId('settlement-history').getByText('Compra de prueba')).toBeVisible();
  await expect(page.getByTestId('settlement-history').getByText('Pan de prueba')).toBeVisible();
  await assertFits(page);
});
test('expense input rejects invalid amounts and accepts decimal comma', async ({ page }) => {
  await enter(page, 'cuentas');
  await page.getByRole('button', { name: 'Añadir gasto' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Concepto').fill('Café con coma');
  for (const amount of ['0', '-1', '1.234', 'NaN']) {
    await dialog.getByLabel('Importe (€)').fill(amount);
    await dialog.getByRole('button', { name: 'Guardar gasto' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
  }
  await dialog.getByLabel('Importe (€)').fill('12,50');
  await dialog.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.getByText('Café con coma', { exact: true })).toBeVisible();
  await expect(page.locator('.expense-row').filter({ hasText: 'Café con coma' })).toContainText('12,50');
});
test('all five views navigate without console errors or horizontal overflow', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await enter(page);
  for (const name of ['Inicio', 'Calendario', 'Tareas', 'Recetas', 'Cuentas']) {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name, exact: true }).click();
    await expect(page.locator('main h1')).toBeVisible();
    await assertFits(page);
  }
  expect(errors).toEqual([]);
});
