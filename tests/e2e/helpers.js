import { expect } from '@playwright/test';
export async function enter(page, route = 'inicio') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como Álex' }).click();
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: { inicio: 'Inicio', calendario: 'Calendario', tareas: 'Tareas', recetas: 'Recetas', cuentas: 'Cuentas' }[route], exact: true }).click();
}
export async function assertFits(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
