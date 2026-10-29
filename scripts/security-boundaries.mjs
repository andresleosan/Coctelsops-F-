import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { installedPackages } from './security-inventory.mjs';

const active = installedPackages(['zod', '@opentelemetry/core']);
for (const { name, version, dir, pkg } of active) {
  const req = createRequire(path.join(dir, 'package.json'));
  if (name === 'zod') {
    const modules = [['CJS', req(dir)]];
    if (pkg.module) modules.push(['ESM', await import(pathToFileURL(path.join(dir, pkg.module)).href)]);
    for (const [format, mod] of modules) {
      const z = mod.z ?? mod;
      for (const kind of ['array-max', 'array-length', 'set-max', 'set-size']) {
        for (const async of [false, true]) {
          let visits = 0;
          const visit = () => { visits++; return true; };
          const item = z.string().refine(async ? async () => visit() : visit);
          const schema = kind === 'array-max' ? z.array(item).max(2)
            : kind === 'array-length' ? z.array(item).length(2)
            : kind === 'set-max' ? z.set(item).max(2) : z.set(item).size(2);
          const data = count => kind.startsWith('array') ? ['a', 'b', 'c'].slice(0, count) : new Set(['a', 'b', 'c'].slice(0, count));
          const parse = value => async ? schema.safeParseAsync(value) : schema.safeParse(value);
          assert.equal((await parse(data(3))).success, false);
          assert.equal(visits, 0, `${dir}/${format}/${kind} walked oversized input`);
          assert.equal((await parse(data(2))).success, true);
          assert.equal(visits, 2);
          console.log(`PASS ${name}@${version} ${format} ${kind} ${async ? 'async' : 'sync'}`);
        }
      }
    }
  } else {
    const { W3CBaggagePropagator } = req(dir);
    const api = req('@opentelemetry/api');
    const propagator = new W3CBaggagePropagator();
    const extract = baggage => api.propagation.getBaggage(propagator.extract(api.ROOT_CONTEXT, { baggage }, api.defaultTextMapGetter));
    assert.equal(extract('x=' + 'a'.repeat(8191)), undefined, `${dir}: accepts oversized entry`);
    assert.equal(extract('tenant=sample').getEntry('tenant').value, 'sample');
    if (version.startsWith('1.')) {
      assert.equal(extract(Array(181).fill('x=a')), undefined, `${dir}: accepts >180 headers`);
      assert.equal(extract(Array(180).fill('x=' + 'a'.repeat(48))), undefined, `${dir}: accepts oversized joined headers`);
      for (const malformed of [undefined, null, 42, {}, ['x=a', 42]]) assert.equal(extract(malformed), undefined);
      assert.equal(extract('x=' + 'a'.repeat(8190)).getEntry('x').value.length, 8190);
      assert.equal(extract(Array(180).fill('x=a')).getEntry('x').value, 'a');
      for (const build of ['src', 'esm', 'esnext']) {
        const text = fs.readFileSync(path.join(dir, 'build', build, 'baggage/propagation/W3CBaggagePropagator.js'), 'utf8');
        assert(text.indexOf('incoming.length > 180') >= 0 && text.indexOf('incoming.length > 180') < text.indexOf('headerValue.join('));
        assert(text.includes('incomingLength > 8193'));
      }
    } else {
      const [major, minor] = version.split('.').map(Number);
      assert(major > 2 || (major === 2 && minor >= 8), `${dir}: requires upstream fixed core >=2.8`);
      // Upstream core 2 retains the bounded prefix; the core 1 backport rejects the whole excessive header.
      for (const headers of [Array.from({ length: 1000 }, (_, i) => `k${i}=sample`), Array.from({ length: 180 }, (_, i) => `k${i}=${'a'.repeat(100)}`)]) {
        const entries = extract(headers).getAllEntries();
        assert(entries.length <= 180, `${dir}: retains excessive baggage entries`);
        assert(entries.map(([key, entry]) => `${key}=${entry.value}`).join(',').length <= 8192, `${dir}: retains excessive baggage text`);
      }
    }
    console.log(`PASS ${name}@${version} ${version.startsWith('1.') ? 'text/header bounds, malformed inputs' : 'upstream retained-prefix bounds'} and ordinary baggage (${dir})`);
  }
}
console.log(`PASS security boundaries in ${active.length} active installed package copies`);
