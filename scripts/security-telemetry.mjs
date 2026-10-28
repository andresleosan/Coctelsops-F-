import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { installedPackages } from './security-inventory.mjs';

process.env.GENKIT_ENV = 'prod';
process.env.OTEL_TRACES_EXPORTER = 'none';
process.env.OTEL_METRICS_EXPORTER = 'none';
process.env.OTEL_LOGS_EXPORTER = 'none';

const inventory = installedPackages(['@opentelemetry/propagator-jaeger']);
const req = createRequire(path.join(process.cwd(), 'package.json'));
const genkitReq = createRequire(req.resolve('genkit'));
const coreReq = createRequire(genkitReq.resolve('@genkit-ai/core'));
const { NodeSDK } = coreReq('@opentelemetry/sdk-node');
const api = coreReq('@opentelemetry/api');
const sdk = new NodeSDK({ autoDetectResources: false, spanProcessors: [], instrumentations: [] });
sdk.start();
try {
  for (const { dir, version } of inventory) {
    const { JaegerPropagator } = req(dir);
    const propagator = new JaegerPropagator();
    for (const value of ['bad', '0:0:0:0', 'f'.repeat(10000), [], ['invalid'], undefined]) {
      assert.doesNotThrow(() => propagator.extract(api.ROOT_CONTEXT, { 'uber-trace-id': value }, api.defaultTextMapGetter));
    }
    const ctx = propagator.extract(api.ROOT_CONTEXT, {
      'uber-trace-id': '4bf92f3577b34da6a3ce929d0e0e4736:00f067aa0ba902b7:0:1',
    }, api.defaultTextMapGetter);
    assert.equal(api.trace.getSpanContext(ctx).traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
    console.log(`PASS Jaeger ${version} malformed and valid propagation`);
  }
  const firebaseReq = createRequire(coreReq.resolve('@genkit-ai/firebase'));
  const googleReq = createRequire(firebaseReq.resolve('@genkit-ai/google-cloud'));
  const { Resource } = googleReq('@opentelemetry/resources');
  assert.equal(new Resource({ 'security.contract': 'local' }).attributes['security.contract'], 'local');
  const { getNodeAutoInstrumentations } = googleReq('@opentelemetry/auto-instrumentations-node');
  const instruments = getNodeAutoInstrumentations();
  assert(instruments.length > 10);
  for (const item of instruments) {
    assert.equal(typeof item.setTracerProvider, 'function');
    item.setTracerProvider(api.trace.getTracerProvider());
    item.disable();
  }
  console.log(`PASS Google Cloud Resource constructor and ${instruments.length} actual instrumentation registrations`);
} finally {
  await sdk.shutdown();
}
const { genkit, z } = req('genkit');
const ai = genkit({ plugins: [] });
const flow = ai.defineFlow({
  name: 'securityLocalContract',
  inputSchema: z.object({ name: z.string().min(1) }),
  outputSchema: z.string(),
}, async input => 'ok:' + input.name);
assert.equal(await flow({ name: 'sample' }), 'ok:sample');
await assert.rejects(flow({ name: '' }));
console.log('PASS SDK initialization/shutdown and local Genkit flow/schema without a model, plugin or network exporter');
