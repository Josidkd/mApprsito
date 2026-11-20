import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../scripts/build.js';
import { prepareDeployment } from '../scripts/deploy.js';
async function output(t, mode = 'firebase') { const directory = await mkdtemp(join(tmpdir(), 'marsito-deploy-')); t.after(() => rm(directory, { recursive: true, force: true })); await build({ mode, outdir: directory }); return directory; }
test('deployment targets exactly the real project and only Hosting plus Firestore rules/indexes', async t => {
  const directory = await output(t);
  const args = await prepareDeployment({ projectId: 'marsito-beta', directory });
  assert.deepEqual(args, ['deploy', '--project', 'marsito-beta', '--only', 'hosting,firestore:rules,firestore:indexes']);
  await assert.rejects(prepareDeployment({ projectId: 'other-project', directory }));
});
test('demo/emulator builds and tampered public output are never deployable', async t => {
  await assert.rejects(prepareDeployment({ projectId: 'marsito-beta', directory: await output(t, 'emulator') }));
  await assert.rejects(prepareDeployment({ projectId: 'marsito-beta', directory: await output(t, 'demo') }));
  const directory = await output(t); await mkdir(join(directory, '.git')); await writeFile(join(directory, '.git/config'), 'private');
  await assert.rejects(prepareDeployment({ projectId: 'marsito-beta', directory }));
});
test('private keys or changed assets block publication, while the public Firebase API key is permitted', async t => {
  const directory = await output(t);
  await prepareDeployment({ projectId: 'marsito-beta', directory });
  const asset = join(directory, 'assets/app.js'); const source = await readFile(asset, 'utf8');
  await writeFile(asset, source + '\n-----BEGIN PRIVATE KEY-----\nnot-a-real-key');
  await assert.rejects(prepareDeployment({ projectId: 'marsito-beta', directory }));
});
