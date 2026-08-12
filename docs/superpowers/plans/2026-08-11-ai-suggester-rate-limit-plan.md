# Rate Limiting Del Sugeridor AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limitar el Sugeridor AI anónimo a cinco solicitudes por IP cada diez minutos mediante un contador atómico compartido en Firestore, sin guardar IPs crudas ni modificar el flujo de compra.

**Architecture:** La server action valida primero las preferencias y luego reserva una solicitud en un documento `ai_rate_limits/{digest}` dentro de una transacción Firestore. La identidad se obtiene de headers de proxy confiables y se transforma con HMAC-SHA256 usando un secreto privado. Si el límite, el secreto o Gemini fallan, la action expone únicamente `AIFlavorSuggesterError` con el mensaje genérico existente.

**Tech Stack:** Next.js 16 App Router, server actions, Firebase Admin Firestore, Node `crypto`, Zod, Vitest, Firebase Emulator Suite, Playwright local E2E.

## Global Constraints

- El Sugeridor permanece anónimo.
- El límite es exactamente 5 solicitudes por identidad durante una ventana de 10 minutos.
- La identidad usa `cf-connecting-ip`, luego la primera entrada de `x-forwarded-for`, luego `x-real-ip`; sin header confiable usa un bucket anónimo compartido.
- Solo se persiste un HMAC-SHA256 de la identidad; nunca IP cruda, prompts, respuestas ni errores técnicos.
- `AI_RATE_LIMIT_SECRET` es privado y obligatorio fuera de emuladores; si falta, la action falla cerrado antes de invocar Gemini.
- El contador se actualiza con `runTransaction` para evitar superar el límite bajo concurrencia.
- Se conserva `preferences` entre 3 y 240 caracteres, la salida limitada y el timeout de 10 segundos.
- El exceso de límite usa el mensaje `No pudimos generar una sugerencia en este momento.`.
- No se agrega Redis, Upstash, CAPTCHA, Turnstile, dependencia nueva, autenticación previa, proveedor AI nuevo ni migración destructiva.
- No se ejecutan despliegues ni cambios remotos sin confirmación explícita del operador.
- No se crean commits automáticos durante la ejecución del plan.

## File Map

- Create `src/lib/ai/ai-rate-limit.ts`: extracción de identidad, HMAC y reserva transaccional de cuota.
- Modify `src/ai/flows/ai-flavor-suggester.ts`: invocar la reserva antes del flow y convertir sus fallos al error genérico.
- Modify `.env.example`: documentar `AI_RATE_LIMIT_SECRET` como secreto privado.
- Create `tests/lib/ai-rate-limit.test.ts`: probar identidad, digest, ventana, rechazo y reinicio con Firestore mockeado.
- Modify `tests/lib/ai-flavor-suggester.test.ts`: cubrir integración, límite antes de Gemini, secreto ausente, timeout y proveedor.
- Create `tests/integration/ai-rate-limit-emulator.test.ts`: probar transacciones concurrentes contra Firestore Emulator si el runner existente lo permite sin datos remotos.
- Modify `docs/superpowers/specs/2026-08-11-ai-suggester-rate-limit-design.md` solo si la implementación descubre una diferencia necesaria; documentar la decisión en el reporte de tarea.

---

### Task 1: Contrato Y Utilidades De Identidad

**Files:**
- Create: `src/lib/ai/ai-rate-limit.ts`
- Create: `tests/lib/ai-rate-limit.test.ts`

**Interfaces:**
- `getRateLimitIdentity(headers: Pick<Headers, "get">): string`
- `hashRateLimitIdentity(identity: string, secret: string): string`
- `RATE_LIMIT_MAX_REQUESTS = 5`
- `RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000`

- [x] **Step 1: Escribir pruebas RED para seleccionar headers sin guardar IP cruda**

Agregar casos que esperen:

```ts
it("prioriza la IP de Cloudflare", () => {
  const headers = new Headers({
    "cf-connecting-ip": "203.0.113.8",
    "x-forwarded-for": "198.51.100.4, 198.51.100.5",
    "x-real-ip": "192.0.2.1",
  });

  expect(getRateLimitIdentity(headers)).toBe("203.0.113.8");
});

it("toma la primera IP reenviada y usa bucket compartido si faltan headers", () => {
  expect(getRateLimitIdentity(new Headers({ "x-forwarded-for": " 198.51.100.4, 198.51.100.5 " }))).toBe("198.51.100.4");
  expect(getRateLimitIdentity(new Headers())).toBe("anonymous");
});
```

Agregar un caso que compruebe que `hashRateLimitIdentity("203.0.113.8", "secret")` produce un digest hexadecimal de 64 caracteres y no contiene la IP.

- [x] **Step 2: Ejecutar RED de utilidades**

Run: `npx vitest run tests/lib/ai-rate-limit.test.ts`

Expected: FAIL porque todavía no existe el módulo ni las funciones exportadas.

- [x] **Step 3: Implementar identidad y HMAC mínimos**

Usar `createHmac("sha256", secret).update(identity).digest("hex")`. Recortar headers, tomar solo la primera entrada separada por coma y aceptar solo una identidad no vacía. Si todos los headers faltan, devolver exactamente `anonymous`.

- [x] **Step 4: Verificar GREEN de utilidades**

Run: `npx vitest run tests/lib/ai-rate-limit.test.ts`

Expected: todos los casos de selección y digest pasan.

### Task 2: Contador Firestore Atómico

**Files:**
- Modify: `src/lib/ai/ai-rate-limit.ts`
- Modify: `tests/lib/ai-rate-limit.test.ts`

**Interfaces:**
- `reserveAIRateLimit(options: { db: Firestore; digest: string; now?: Date }): Promise<boolean>`

- [x] **Step 1: Escribir pruebas RED del contador**

Mockear `getAdminDb` solo si se usa desde el módulo; preferiblemente inyectar `db` en la función. Cubrir documentos inexistentes, contador menor a cinco, contador cinco dentro de ventana y ventana vencida:

```ts
it("permite las primeras cinco reservas y rechaza la sexta", async () => {
  const db = createFakeFirestoreRateLimitDb();

  for (let attempt = 1; attempt <= 5; attempt++) {
    await expect(reserveAIRateLimit({ db, digest: "a".repeat(64), now: new Date("2026-08-11T12:00:00.000Z") })).resolves.toBe(true);
  }

  await expect(reserveAIRateLimit({ db, digest: "a".repeat(64), now: new Date("2026-08-11T12:01:00.000Z") })).resolves.toBe(false);
});

it("reinicia la ventana vencida", async () => {
  const db = createFakeFirestoreRateLimitDb();
  const digest = "b".repeat(64);

  for (let attempt = 0; attempt < 5; attempt++) {
    await reserveAIRateLimit({ db, digest, now: new Date("2026-08-11T12:00:00.000Z") });
  }

  await expect(reserveAIRateLimit({ db, digest, now: new Date("2026-08-11T12:10:00.001Z") })).resolves.toBe(true);
});
```

El fake debe ejecutar la función transaccional con un documento persistente y exponer solo los métodos usados por producción. No comprobar detalles internos irrelevantes.

- [x] **Step 2: Ejecutar RED del contador**

Run: `npx vitest run tests/lib/ai-rate-limit.test.ts`

Expected: FAIL porque `reserveAIRateLimit` todavía no existe.

- [x] **Step 3: Implementar la transacción mínima**

Usar el documento `ai_rate_limits/{digest}` y campos `windowStartedAt`, `count`, `updatedAt`. En cada transacción: leer, crear `count: 1` si no existe, devolver `false` si la ventana está vigente y el count ya es cinco, incrementar si sigue vigente, o reiniciar a uno si expiró. Usar `Timestamp.fromDate(now)` y operaciones compatibles con Firebase Admin.

- [x] **Step 4: Verificar GREEN y revisar atomicidad**

Run: `npx vitest run tests/lib/ai-rate-limit.test.ts`

Expected: casos secuenciales y de ventana vencida pasan. La implementación no debe usar read-then-write fuera de una transacción.

### Task 3: Integrar El Rate Limit En La Server Action

**Files:**
- Modify: `src/ai/flows/ai-flavor-suggester.ts`
- Modify: `tests/lib/ai-flavor-suggester.test.ts`
- Modify: `.env.example`

**Interfaces:**
- La action conserva `aiFlavorSuggester(input: AIFlavorSuggesterInput): Promise<AIFlavorSuggesterOutput>`.
- La action obtiene headers con `await headers()` y usa `getAdminDb()` para reservar la cuota.

- [x] **Step 1: Escribir pruebas RED de integración**

Extender los mocks para `next/headers`, `@/lib/firebase-admin` y el módulo de rate limit. Cubrir:

```ts
it("no invoca Gemini después de superar cinco solicitudes", async () => {
  reserveAIRateLimit.mockResolvedValue(false);

  await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toMatchObject({
    name: "AIFlavorSuggesterError",
    message: "No pudimos generar una sugerencia en este momento.",
  });
  expect(aiMocks.prompt).not.toHaveBeenCalled();
});

it("convierte una falta de secreto o fallo del limitador en error genérico", async () => {
  reserveAIRateLimit.mockRejectedValue(new Error("missing rate limit secret"));

  await expect(aiFlavorSuggester({ preferences: "algo citrico" })).rejects.toThrow(
    "No pudimos generar una sugerencia en este momento.",
  );
  expect(aiMocks.prompt).not.toHaveBeenCalled();
});
```

Mantener casos existentes de entrada inválida, salida inválida, proveedor y timeout. Asegurar que la entrada inválida no consume cuota si la validación ocurre antes del limitador.

- [x] **Step 2: Ejecutar RED de integración**

Run: `npx vitest run tests/lib/ai-flavor-suggester.test.ts`

Expected: FAIL hasta que la action invoque headers, Firestore y el limitador.

- [x] **Step 3: Implementar integración y configuración**

Importar `headers` desde `next/headers`, `getAdminDb` desde `@/lib/firebase-admin` y las utilidades del limitador. Después de `AIFlavorSuggesterInputSchema.parse(input)`, obtener `AI_RATE_LIMIT_SECRET` mediante la misma disciplina de entorno privado existente. En modo emulador, exigir que el test lo proporcione; fuera de emulador, ausencia o fallo debe caer en `AIFlavorSuggesterError` antes del flow. El limitador debe ejecutarse antes de crear/invocar el flow de Gemini.

Agregar a `.env.example`:

```text
# Secreto privado para identificar buckets de rate limiting del Sugeridor AI.
AI_RATE_LIMIT_SECRET=replace-with-a-random-server-secret
```

- [x] **Step 4: Verificar GREEN de integración**

Run: `npx vitest run tests/lib/ai-flavor-suggester.test.ts tests/lib/ai-rate-limit.test.ts`

Expected: todos los casos AI y de limitación pasan; ningún prompt se invoca después del rechazo.

### Task 4: Concurrencia Y Emulator

**Files:**
- Create: `tests/integration/ai-rate-limit-emulator.test.ts`
- Modify: `scripts/run-firestore-rules-tests.ts` o runner existente solo si hace falta reutilizar configuración local, sin tocar reglas de producción sin evidencia.

**Interfaces:**
- Usa `reserveAIRateLimit` contra Firestore Emulator en `127.0.0.1`.

- [x] **Step 1: Escribir prueba de concurrencia**

Preparar un documento nuevo por test y ejecutar diez reservas concurrentes para el mismo digest. Esperar exactamente cinco `true` y cinco `false`:

```ts
const results = await Promise.all(
  Array.from({ length: 10 }, () => reserveAIRateLimit({ db, digest, now })),
);
expect(results.filter(Boolean)).toHaveLength(5);
```

- [x] **Step 2: Ejecutar la prueba contra emulator**

Run: `FIRESTORE_RULES_EMULATOR=true npx vitest run tests/integration/ai-rate-limit-emulator.test.ts`

Expected: la prueba usa exclusivamente Firestore Emulator loopback y falla si el host no es loopback.

- [x] **Step 3: Ajustar solo lo necesario para concurrencia real**

Si Firestore rechaza la transacción por conflictos transitorios, conservar el retry interno del SDK y no agregar reintentos infinitos en la aplicación. Cualquier error definitivo debe propagarse al wrapper genérico de la server action.

- [x] **Step 4: Verificar concurrencia y limpieza**

Run: `npm run test:firestore-rules`

Expected: las reglas existentes pasan y el runner limpia únicamente sus datos efímeros. No dejar `local-state.json`, locks ni credenciales de prueba.

### Task 5: Documentación Y Gate De Seguridad

**Files:**
- Modify: `README.md` solo en la sección `Sugeridor AI`, preservando cambios previos ajenos mediante parche contextual.
- Modify: `docs/superpowers/specs/2026-08-11-ai-suggester-rate-limit-design.md` solo si la implementación cambió un detalle aprobado.

- [x] **Step 1: Actualizar documentación operativa**

Documentar el límite `5 solicitudes por IP cada 10 minutos`, el secreto privado `AI_RATE_LIMIT_SECRET`, el mensaje genérico, la ausencia de IPs crudas y que los documentos Firestore tienen expiración lógica sin limpieza inmediata.

- [x] **Step 2: Revisar seguridad**

Comprobar que no haya IP, secreto, prompt, respuesta o error crudo en logs, documentos, tests o respuestas. Verificar que el limitador corre antes de Gemini y que el fallback sin header no permite al cliente elegir buckets arbitrarios.

- [x] **Step 3: Verificar documentación y diff**

Run: `git diff --check`

Expected: sin errores de whitespace; no incluir `.env.local`, tokens ni archivos generados.

### Task 6: Gate Integral Y Preparación De Despliegue

**Files:**
- Modify only files from Tasks 1-5 if a verification exposes a regression.

- [x] **Step 1: Ejecutar pruebas enfocadas**

Run: `npx vitest run tests/lib/ai-rate-limit.test.ts tests/lib/ai-flavor-suggester.test.ts`

- [x] **Step 2: Ejecutar suite y análisis estático**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run lint`

- [x] **Step 3: Ejecutar build y QA local**

Run: `npm run build`

Run: `npm run test:firestore-rules`

Run: `npm run test:e2e:local`

- [x] **Step 4: Auditar dependencias y secretos**

Run: `npm audit --omit=dev --audit-level=high`

Run: `git diff --check`

Revisar que `AI_RATE_LIMIT_SECRET` no esté en historial ni salida de herramientas y que los documentos de rate limit no contengan IPs crudas.

- [ ] **Step 5: Preparar despliegue sin ejecutarlo**

Verificar que el secreto esté configurado en los dos proveedores de hosting que reciben `main` y que el presupuesto de `USD 1` permanezca activo. No ejecutar despliegue ni push sin confirmación explícita del operador.

## Self-Review Del Plan

- La identidad, privacidad, contador atómico, integración, concurrencia, documentación y gates de la especificación tienen tareas explícitas.
- No se requiere migración destructiva ni rollback de datos; los documentos se crean bajo una colección técnica separada y se reinician lógicamente al vencer la ventana.
- El plan no agrega una dependencia externa ni asume que un mapa en memoria funciona entre instancias.
- La acción permanece anónima y conserva todos los guardrails existentes.
- La configuración del secreto queda fuera del repositorio y debe resolverse antes del despliegue.
