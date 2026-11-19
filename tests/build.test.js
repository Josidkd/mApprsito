import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from '@playwright/test';
import { build } from '../scripts/build.js';
async function fixture(t, mode) {
  const dir = await mkdtemp(join(tmpdir(), 'marsito-build-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await build({ mode, outdir: dir });
  const server = spawn(process.execPath, ['scripts/serve.js', '--dir', dir], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { const done = once(server, 'exit'); server.kill(); await done; });
  const [data] = await once(server.stdout, 'data');
  return { dir, url: String(data).match(/http:\/\/127\.0\.0\.1:\d+/)[0] };
}
test('firebase build cannot enter demo or turn on emulators through URL parameters', async t => {
  const { dir, url } = await fixture(t, 'firebase');
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route(/googleapis\.com|firebaseio\.com/, route => route.abort());
  await page.goto(url + '/?mode=demo&emulator=true');
  assert.equal(await page.locator('marsito-app').getAttribute('data-mode'), 'firebase');
  assert.equal(await page.getByRole('button', { name: 'Entrar como Álex' }).count(), 0);
  const manifest = JSON.parse(await readFile(join(dir, 'build-info.json'), 'utf8'));
  assert.equal(manifest.projectId, 'marsito-beta'); assert.equal(manifest.mode, 'firebase');
});
test('build publishes only public generated assets and rejects invalid modes', async t => {
  const { dir, url } = await fixture(t, 'firebase');
  assert.deepEqual((await readdir(dir)).sort(), ['assets', 'build-info.json', 'favicon.svg', 'index.html']);
  for (const path of ['/.git/config', '/src/app.js', '/docs/firebase-beta-setup.md', '/package.json']) assert.equal((await fetch(url + path)).status, 404);
  assert.match(await (await fetch(url + '/assets/app.js')).text(), /./);
  await assert.rejects(build({ mode: 'unknown', outdir: dir }));
});
test('demo is an explicit build; emulator builds target only the demo project', async t => {
  const { url } = await fixture(t, 'demo');
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage(); await page.goto(url);
  assert.equal(await page.locator('marsito-app').getAttribute('data-mode'), 'demo');
  await page.getByRole('button', { name: 'Entrar como Álex' }).click();
  assert.equal(await page.getByRole('heading', { name: 'Hola, Álex' }).count(), 1);
  const dir = await mkdtemp(join(tmpdir(), 'marsito-emulator-')); t.after(() => rm(dir, { recursive: true, force: true }));
  await build({ mode: 'emulator', outdir: dir });
  const info = JSON.parse(await readFile(join(dir, 'build-info.json'), 'utf8'));
  assert.equal(info.projectId, 'demo-marsito-beta');
});
