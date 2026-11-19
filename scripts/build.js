import { build as bundle } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export async function build({ mode = 'firebase', outdir = 'dist' } = {}) {
  if (!['demo', 'firebase', 'emulator'].includes(mode)) throw new Error('Modo de build no válido.');
  const output = resolve(outdir);
  await mkdir(resolve(output, 'assets'), { recursive: true });
  await bundle({ entryPoints: ['src/app.js'], bundle: true, outfile: resolve(output, 'assets/app.js'), format: 'esm', target: ['chrome100'], minify: true, define: { __MARSITO_MODE__: JSON.stringify(mode) }, legalComments: 'none' });
  await copyFile('index.html', resolve(output, 'index.html'));
  await copyFile('favicon.svg', resolve(output, 'favicon.svg'));
  await writeFile(resolve(output, 'build-info.json'), JSON.stringify({ mode, projectId: mode === 'emulator' ? 'demo-marsito-beta' : mode === 'firebase' ? 'marsito-beta' : null }));
  return output;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const mode = process.argv[2] || 'firebase';
  await build({ mode, outdir: process.argv[3] || (mode === 'demo' ? 'dist-demo' : mode === 'emulator' ? 'dist-emulator' : 'dist') });
}
