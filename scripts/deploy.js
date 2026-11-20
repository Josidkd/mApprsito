import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { PUBLIC_FILES } from './build.js';
export async function prepareDeployment({ projectId, directory = 'dist' }) {
  if (projectId !== 'marsito-beta' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Destino de despliegue no permitido.');
  const manifest = JSON.parse(await readFile(resolve(directory, 'build-info.json'), 'utf8'));
  if (manifest.mode !== 'firebase' || manifest.projectId !== projectId) throw new Error('Solo se puede desplegar el build Firebase real.');
  const configuration = JSON.parse(await readFile('firebase.json', 'utf8'));
  if (configuration.hosting.public !== 'dist' || !configuration.hosting.ignore.includes('build-info.json')) throw new Error('Configuración pública de Hosting no segura.');
  const files = await readdir(directory, { recursive: true });
  for (const relative of files) {
    const normalized = relative.replaceAll('\\', '/');
    if (!['assets', 'build-info.json', ...PUBLIC_FILES].includes(normalized)) throw new Error('Archivo no permitido en el despliegue: ' + normalized);
    if ((await lstat(resolve(directory, relative))).isSymbolicLink()) throw new Error('No se publican enlaces simbólicos.');
  }
  for (const file of PUBLIC_FILES) {
    const bytes = await readFile(resolve(directory, file));
    if (/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"private_key"\s*:|"type"\s*:\s*"service_account"/.test(bytes.toString())) throw new Error('Se encontró material administrativo en un archivo público.');
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.hashes?.[file]) throw new Error('El build fue modificado después de generarse.');
  }
  return ['deploy', '--project', projectId, '--only', 'hosting,firestore:rules,firestore:indexes'];
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = await prepareDeployment({ projectId: 'marsito-beta' });
  const child = spawn(process.execPath, ['node_modules/firebase-tools/lib/bin/firebase.js', ...args], { stdio: 'inherit' });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
