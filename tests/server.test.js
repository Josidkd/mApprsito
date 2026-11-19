import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
async function start(t, lan, port) {
  const child = spawn(process.execPath, ['scripts/serve.js', ...(lan ? ['--lan'] : [])], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { const exited = once(child, 'exit'); child.kill(); await exited; });
  await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('Server failed to start'); })]);
  return port;
}
test('default server stays local and does not expose repository files', async t => {
  const port = await start(t, false, 4189);
  assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200);
  for (const path of ['/.git/config', '/README.md', '/src/%2e%2e/package.json']) assert.equal((await fetch(`http://127.0.0.1:${port}${path}`)).status, 404);
  await assert.rejects(fetch(`http://127.0.0.2:${port}/`));
});
test('explicit LAN mode accepts another local IPv4 address', async t => {
  const port = await start(t, true, 4191);
  const response = await fetch(`http://127.0.0.2:${port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Marsito/);
});
