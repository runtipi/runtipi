import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getCliSecret } from '../permissions-helpers.ts';

const canChangeUid = process.platform === 'linux' && process.getuid() === 0;
const asLocalUser = (code, root) =>
  spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', code, root], { uid: 65534, gid: 65534, cwd: '/tmp' });

test('another UID retains shared access while the CLI key stays private during recursive permission repair', { skip: !canChangeUid }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtipi-shared-permissions-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.chmodSync(root, 0o755);

  for (const directory of ['state', 'apps', 'repos', 'logs', 'traefik', 'user-config', 'data']) {
    fs.mkdirSync(path.join(root, directory));
    fs.chmodSync(path.join(root, directory), 0o777);
    for (let index = 0; index < 1000; index++) {
      fs.writeFileSync(path.join(root, directory, String(index)), 'shared file');
    }
  }

  const key = await getCliSecret(root);
  const checkAccess = () => {
    const result = asLocalUser(
      `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      const root = process.argv[1];
      assert.equal(fs.readFileSync(root + '/apps/0', 'utf8'), 'shared file');
      fs.writeFileSync(root + '/user-config/host-config', 'host config');
      assert.throws(() => fs.readFileSync(root + '/.secrets/cli-secret'), {code: 'EACCES'});
      assert.throws(() => fs.renameSync(root + '/.secrets/cli-secret', root + '/state/alias'), {code: 'EACCES'});
      assert.throws(() => fs.linkSync(root + '/.secrets/cli-secret', root + '/state/alias'), {code: 'EACCES'});
    `,
      root,
    );
    assert.equal(result.status, 0, result.stderr.toString());
  };

  checkAccess();
  const repair = spawn('sh', [
    '-c',
    'for i in 1 2 3 4 5; do chmod -Rf 777 "$1/state" "$1/data" "$1/apps" "$1/logs" "$1/traefik" "$1/repos" "$1/user-config"; done',
    'repair',
    root,
  ]);
  const repaired = new Promise((resolve, reject) => {
    repair.once('error', reject);
    repair.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`chmod exited ${code}`))));
  });

  checkAccess();
  await repaired;
  checkAccess();
  assert.equal(await getCliSecret(root), key);
  assert.equal(fs.statSync(path.join(root, '.secrets')).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(root, '.secrets/cli-secret')).mode & 0o777, 0o600);
});

test('a private key planted by another UID is rejected', { skip: !canChangeUid }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtipi-planted-key-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.secrets'), { mode: 0o700 });
  const keyPath = path.join(root, '.secrets/cli-secret');
  fs.writeFileSync(keyPath, 'a'.repeat(64), { mode: 0o600 });
  fs.chownSync(keyPath, 65534, 65534);

  await assert.rejects(getCliSecret(root), /must be owned/);
});

test('a service UID can create and persist its own private key', { skip: !canChangeUid }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtipi-service-key-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.chownSync(root, 65534, 65534);
  fs.chmodSync(root, 0o755);

  const result = asLocalUser(
    `
    import assert from 'node:assert/strict';
    import { getCliSecret } from ${JSON.stringify(new URL('../permissions-helpers.ts', import.meta.url).href)};
    const root = process.argv[1];
    const key = await getCliSecret(root);
    assert.equal(await getCliSecret(root), key);
  `,
    root,
  );

  assert.equal(result.status, 0, result.stderr.toString());
});

test('a service UID rotates a readable root-owned exposed key and persists the replacement', { skip: !canChangeUid }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtipi-root-owned-key-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.chownSync(root, 65534, 65534);
  fs.chmodSync(root, 0o755);

  const directory = path.join(root, '.secrets');
  fs.mkdirSync(directory, { mode: 0o700 });
  fs.chownSync(directory, 65534, 65534);
  const secretPath = path.join(directory, 'cli-secret');
  const exposedKey = 'a'.repeat(64);
  fs.writeFileSync(secretPath, exposedKey, { mode: 0o644 });
  fs.chmodSync(secretPath, 0o644);
  assert.equal(fs.statSync(secretPath).uid, 0);

  const rotate = asLocalUser(
    `
    import assert from 'node:assert/strict';
    import { getCliSecret } from ${JSON.stringify(new URL('../permissions-helpers.ts', import.meta.url).href)};
    const key = await getCliSecret(process.argv[1]);
    assert.match(key, /^[a-f0-9]{64}$/);
    assert.notEqual(key, ${JSON.stringify(exposedKey)});
  `,
    root,
  );

  assert.equal(rotate.status, 0, rotate.stderr.toString());
  const replacement = fs.readFileSync(secretPath, 'utf8');
  assert.equal(fs.statSync(secretPath).uid, 65534);
  assert.equal(fs.statSync(secretPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(directory).mode & 0o777, 0o700);

  const restart = asLocalUser(
    `
    import assert from 'node:assert/strict';
    import { getCliSecret } from ${JSON.stringify(new URL('../permissions-helpers.ts', import.meta.url).href)};
    assert.equal(await getCliSecret(process.argv[1]), ${JSON.stringify(replacement)});
  `,
    root,
  );

  assert.equal(restart.status, 0, restart.stderr.toString());
});
