import { test, expect, login, guardNetwork } from './helpers.js';
async function nav(page, name) { await page.getByRole('navigation').getByRole('link', { name, exact: true }).click(); }
async function addExpense(page, concept, amount) {
  await page.getByRole('button', { name: 'Añadir gasto' }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Concepto').fill(concept); await dialog.getByLabel('Importe (€)').fill(amount); await dialog.getByRole('button', { name: 'Guardar gasto' }).click(); await expect(dialog).toHaveCount(0);
}
test('two independent users share all sections without demo data or identity switching', async ({ page, browser, members }) => {
  test.setTimeout(60000);
  const otherContext = await browser.newContext({ viewport: page.viewportSize() });
  const other = await otherContext.newPage(); await guardNetwork(other);
  try {
    await login(page, members.alice); await login(other, members.bob);
    await expect(page.getByText('Noche de cine en casa')).toHaveCount(0);
    await nav(page, 'Tareas'); await nav(other, 'Tareas');
    await page.getByRole('button', { name: 'Nueva tarea' }).click(); let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Título', { exact: true }).fill('Tarea sincronizada'); await dialog.getByLabel('Tarea', { exact: true }).fill('Desde Alice hasta Bob');
    await dialog.getByRole('button', { name: 'Crear tarea' }).click();
    await other.getByRole('checkbox', { name: 'Tarea sincronizada', exact: true }).check();
    await expect(page.getByRole('checkbox', { name: 'Tarea sincronizada', exact: true })).toBeChecked();
    await nav(page, 'Calendario'); await nav(other, 'Calendario');
    await page.getByRole('button', { name: 'Nuevo evento' }).click(); dialog = page.getByRole('dialog');
    await dialog.getByLabel('Título', { exact: true }).fill('Plan sincronizado'); await dialog.getByLabel('Hora', { exact: true }).fill('21:00'); await dialog.getByLabel('Descripción', { exact: true }).fill('Un plan real'); await dialog.getByRole('button', { name: 'Crear evento' }).click();
    await page.getByRole('button', { name: 'Ver evento: Plan sincronizado' }).click();
    await other.getByRole('button', { name: 'Ver evento: Plan sincronizado' }).click();
    await other.getByRole('dialog').getByRole('button', { name: 'Sí, voy' }).click();
    await expect(dialog.getByText('Bob · Sí')).toBeVisible();
    await other.getByLabel('Tu comentario').fill('<b>Yo llevo el postre</b>'); await other.getByRole('button', { name: 'Comentar', exact: true }).click();
    await expect(dialog.getByText('<b>Yo llevo el postre</b>', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click(); await other.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await nav(page, 'Recetas'); await nav(other, 'Recetas');
    await page.getByRole('button', { name: 'Nueva receta' }).click(); dialog = page.getByRole('dialog');
    await dialog.getByLabel('Título', { exact: true }).fill('Sopa sincronizada'); await dialog.getByLabel('Ingredientes (uno por línea)').fill('Agua\nSal'); await dialog.getByLabel('Instrucciones').fill('Hervir'); await dialog.getByRole('button', { name: 'Guardar receta' }).click();
    await expect(other.getByRole('button', { name: 'Ver receta: Sopa sincronizada' })).toBeVisible();
    await page.getByRole('tab', { name: 'Menú semanal' }).click(); await other.getByRole('tab', { name: 'Menú semanal' }).click();
    await page.getByLabel(/^Comida del /).first().selectOption({ label: 'Sopa sincronizada' }); await expect(other.getByLabel(/^Comida del /).first().locator('option:checked')).toHaveText('Sopa sincronizada');
    await nav(page, 'Cuentas'); await nav(other, 'Cuentas');
    await addExpense(page, 'Compra Alice', '30'); await addExpense(other, 'Compra Bob', '10');
    await expect(page.getByTestId('balance-transfer')).toContainText('Bob debe a Alice'); await expect(page.getByTestId('balance-transfer')).toContainText('10,00');
    await page.getByRole('button', { name: 'Liquidar', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar liquidación' }).click();
    await expect(other.getByRole('button', { name: 'Liquidar', exact: true })).toBeDisabled();
    await expect(page.getByTestId('settlement-history').getByText('Compra Alice', { exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByTestId('settlement-history').getByText('Compra Bob', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).includes('marsito.demo.v1'))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await otherContext.close(); }
});
