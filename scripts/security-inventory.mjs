import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function installedPackages(names) {
  assert(process.env.npm_execpath, 'Run through npm run test:security');
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'ls', '--all', '--long', '--json'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `Installed dependency inventory failed: ${result.stderr}`);
  const found = new Map();
  function collect(node) {
    for (const [name, child] of Object.entries(node.dependencies ?? {})) {
      if (names.includes(name)) {
        assert(child.path, `Missing installed path for ${name}`);
        const dir = fs.realpathSync(child.path);
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        found.set(dir, { name, version: pkg.version, dir, pkg });
      }
      collect(child);
    }
  }
  collect(JSON.parse(result.stdout));
  for (const name of names) assert([...found.values()].some(pkg => pkg.name === name), `No active ${name} consumer found`);
  return [...found.values()];
}
