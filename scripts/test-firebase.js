import { spawn } from 'node:child_process';
import { readdir, access } from 'node:fs/promises';
import { resolve, delimiter } from 'node:path';
const env = { ...process.env, GCLOUD_PROJECT: 'demo-marsito-beta', GOOGLE_CLOUD_PROJECT: 'demo-marsito-beta' };
if (process.platform === 'win32' && !env.JAVA_HOME) {
  const parent = 'C:/Program Files/Eclipse Adoptium';
  try {
    const dirs = await readdir(parent);
    const candidate = dirs.find(name => name.startsWith('jdk-21'));
    if (candidate) { env.JAVA_HOME = resolve(parent, candidate); env.PATH = resolve(env.JAVA_HOME, 'bin') + delimiter + env.PATH; }
  } catch { /* Java may already be in PATH. CLI explains missing Java. */ }
}
const e2e = process.argv[2] === 'e2e';
const names = process.argv.slice(e2e ? 3 : 2);
let command;
if (e2e) {
  if (names.some(value => !/^[\w/.=:-]+$/.test(value))) throw new Error('Argumentos de test no válidos.');
  command = 'node node_modules/@playwright/test/cli.js test --config playwright.firebase.config.js --workers=1 ' + names.join(' ');
}
else {
  const files = (await readdir('tests/firebase')).filter(file => file.endsWith('.test.js') && (!names.length || names.some(name => file.includes(name))));
  if (!files.length) throw new Error('No hay pruebas Firebase que coincidan.');
  command = `node --test --test-concurrency=1 ${files.map(file => 'tests/firebase/' + file).join(' ')}`;
}
await access('firestore.rules');
const child = spawn(process.execPath, ['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:exec', '--project', 'demo-marsito-beta', '--only', 'auth,firestore', command], { env, stdio: 'inherit' });
child.on('exit', code => { process.exitCode = code ?? 1; });
