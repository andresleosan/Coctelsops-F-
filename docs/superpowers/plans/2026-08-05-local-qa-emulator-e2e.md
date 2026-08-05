# QA local con Firebase Emulator y Playwright Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear un entorno local reproducible que ejecute reglas Firestore y los tres escenarios E2E de autenticación, checkout y operaciones administrativas sin usar Firebase remoto.

**Architecture:** Firebase Authentication y Firestore Emulator correrán en loopback. Un setup efímero creará usuarios, roles, catálogo y configuración para la corrida; Playwright levantará Next.js local mediante `webServer` y consumirá ese estado temporal. El cliente web y Firebase Admin solo usarán emuladores cuando una bandera explícita y hosts loopback estén presentes; el comportamiento normal seguirá exigiendo la configuración real del entorno.

**Tech Stack:** Firebase CLI Emulator Suite, Firebase Admin SDK, Firebase Web SDK, Next.js 15, Playwright, Vitest, `@firebase/rules-unit-testing`, TypeScript y Node `child_process`.

## Global Constraints

- No usar credenciales de Firebase de producción.
- No desplegar reglas, índices, seed ni migraciones a Firebase remoto.
- No ejecutar `scripts/migrate-orders.ts` ni `scripts/verify-migration.ts` sobre datos reales.
- La limpieza solo acepta `localhost` o `127.0.0.1` y requiere `E2E_CLEANUP_CONFIRM=DELETE_E2E_DATA`.
- La bandera de emuladores no se activa por defecto en builds normales.
- Los estados, reportes y resultados generados por E2E no se versionan.
- `npm test` debe continuar excluyendo `tests/e2e/**`.
- Después de cambios de código se ejecutan `npm test` y `npm run typecheck`; para UI/configuración también `npm run lint` y `npm run build`.

---

### Task 1: Configurar el modo explícito de Firebase Emulator

**Files:**
- Modify: `firebase.json`
- Modify: `.env.example`
- Create: `src/firebase/emulators.ts`
- Modify: `src/firebase/index.ts`
- Modify: `src/lib/firebase-admin.ts`
- Test: `tests/lib/firebase-emulators.test.ts`

**Interfaces:**
- Produces `shouldUseFirebaseEmulators(environment?: Record<string, string | undefined>): boolean`.
- Produces `assertLoopbackEmulatorHosts(environment: Record<string, string | undefined>): void`.
- `initializeFirebase()` connects Auth y Firestore a emuladores solo cuando `NEXT_PUBLIC_FIREBASE_EMULATORS === "true"` y los destinos son loopback.
- `getAdminApp()` inicializa Firebase Admin sin certificado solo cuando `FIREBASE_EMULATORS === "true"` y ambos hosts son loopback; fuera de ese caso conserva `requireEnv` para `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.

- [ ] **Step 1: Escribir pruebas de seguridad del modo emulator.**

```ts
import { describe, expect, it } from "vitest";
import { assertLoopbackEmulatorHosts, shouldUseFirebaseEmulators } from "@/firebase/emulators";

describe("Firebase Emulator mode", () => {
  it("requires the explicit client flag", () => {
    expect(shouldUseFirebaseEmulators({
      NEXT_PUBLIC_FIREBASE_EMULATORS: "false",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    })).toBe(false);
  });

  it("accepts only loopback emulator hosts", () => {
    expect(() => assertLoopbackEmulatorHosts({
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
    })).not.toThrow();
    expect(() => assertLoopbackEmulatorHosts({
      FIRESTORE_EMULATOR_HOST: "firestore.example.com:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
    })).toThrow("loopback");
  });
});
```

- [ ] **Step 2: Ejecutar el test para confirmar el fallo inicial.**

Run: `npm test -- --run tests/lib/firebase-emulators.test.ts`

Expected: FAIL porque `src/firebase/emulators.ts` todavía no existe.

- [ ] **Step 3: Implementar las comprobaciones loopback.**

Usar un parser que acepte únicamente `localhost:<puerto>` y `127.0.0.1:<puerto>` con puertos entre `1` y `65535`. `shouldUseFirebaseEmulators` devolverá `true` solo si la bandera explícita vale exactamente `"true"` y ambos hosts pasan la comprobación.

- [ ] **Step 4: Conectar el SDK web de forma idempotente.**

En `initializeFirebase`, después de crear `auth` y `db`, llamar una sola vez a `connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })` y `connectFirestoreEmulator(db, "127.0.0.1", 8080)` cuando `shouldUseFirebaseEmulators()` sea verdadero. Mantener un estado de módulo para no conectar dos veces durante hot reload.

- [ ] **Step 5: Permitir inicialización Admin sin certificado únicamente en emulator.**

Cuando `FIREBASE_EMULATORS=true`, validar hosts loopback y ejecutar `initializeApp({ projectId: requireEnv("FIREBASE_PROJECT_ID") })`. En cualquier otro caso no relajar la exigencia de `FIREBASE_CLIENT_EMAIL` ni `FIREBASE_PRIVATE_KEY`.

- [ ] **Step 6: Declarar configuración local sin secretos.**

Agregar a `firebase.json` los emuladores Auth en `9099` y Firestore en `8080`. Documentar en `.env.example` `FIREBASE_EMULATORS=false`, `NEXT_PUBLIC_FIREBASE_EMULATORS=false`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` y `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, indicando que solo se activan en el comando local.

- [ ] **Step 7: Verificar y commit.**

Run: `npm test -- --run tests/lib/firebase-emulators.test.ts tests/lib/server-env.test.ts`

Run: `npm run typecheck`

Commit: `git add firebase.json .env.example src/firebase/emulators.ts src/firebase/index.ts src/lib/firebase-admin.ts tests/lib/firebase-emulators.test.ts && git commit -m "test: preparar modo local de Firebase Emulator"`

### Task 2: Crear el setup de datos E2E efímeros

**Files:**
- Create: `scripts/e2e-local-state.ts`
- Create: `scripts/e2e-local-cleanup.ts`
- Create: `tests/e2e/local-state.ts`
- Modify: `.gitignore`
- Test: `tests/lib/e2e-local-state.test.ts`

**Interfaces:**
- Produces `LocalE2EState` with `customer`, `staff` and `admin`, each containing `email`, `password` and `uid`.
- Produces `prepareLocalE2EState(): Promise<LocalE2EState>`.
- Produces `cleanupLocalE2EState(state: LocalE2EState): Promise<void>`.
- `loadLocalE2EState(): LocalE2EState | undefined` reads only the path from `E2E_STATE_FILE` or `.tmp/e2e/local-state.json`.

- [ ] **Step 1: Escribir pruebas del estado temporal.**

Cubrir generación de dominios `local.test`, contraseñas no vacías, ausencia de secretos en el repositorio y rechazo de limpieza cuando los hosts no son loopback. El test no debe llamar a Firebase; debe probar las funciones puras de generación y validación.

- [ ] **Step 2: Implementar generación de identidades efímeras.**

Usar `crypto.randomBytes` para una contraseña por corrida y correos con timestamp más sufijo `@local.test`. No usar valores de producción ni persistir las contraseñas fuera del archivo temporal ignorado.

- [ ] **Step 3: Crear usuarios en Auth Emulator.**

Con Firebase Admin crear los tres usuarios con correo, contraseña y `emailVerified: true`. Asignar el claim `admin: true` solo al administrador. El staff no recibirá el claim admin; sus permisos se resolverán mediante el rol Firestore.

- [ ] **Step 4: Crear perfiles, roles y datos mínimos.**

Escribir en Firestore Emulator perfiles `users/{uid}`, roles para cliente, staff y admin, productos activos con IDs usados por checkout, categorías y configuración pública. Usar los repositorios o mapeos del dominio existentes y no escribir en un proyecto remoto.

- [ ] **Step 5: Escribir el estado en una ruta temporal.**

Crear `.tmp/e2e/local-state.json` con permisos del proceso actual. El archivo debe contener únicamente datos de prueba de la corrida y debe eliminarse en el cleanup. Añadir `.tmp/e2e/`, `qa/reports/` y `qa/test-results/` a `.gitignore`.

- [ ] **Step 6: Implementar cleanup seguro.**

Reutilizar `getCleanupSafetyError` antes de borrar. El cleanup debe eliminar pedidos, auditoría, notificaciones, perfiles y usuarios del estado; si falta confirmación o algún host no es loopback debe fallar sin borrar nada.

- [ ] **Step 7: Verificar y commit.**

Run: `npm test -- --run tests/lib/e2e-local-state.test.ts tests/lib/e2e-cleanup.test.ts`

Run: `npm run typecheck`

Commit: `git add scripts/e2e-local-state.ts scripts/e2e-local-cleanup.ts tests/e2e/local-state.ts tests/lib/e2e-local-state.test.ts .gitignore && git commit -m "test: preparar datos efimeros para E2E local"`

### Task 3: Configurar Playwright local y adaptar la suite existente

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json`
- Modify: `tests/e2e/auth-checkout-admin.spec.ts`
- Modify: `tests/e2e/cleanup-safety.ts`
- Test: `tests/lib/playwright-config.test.ts`

**Interfaces:**
- `playwright.config.ts` produce un `baseURL` local por defecto y conserva `E2E_BASE_URL` para ejecuciones externas.
- `loadLocalE2EState()` alimenta las credenciales solo cuando no existen variables E2E explícitas.
- `npm run test:e2e:local` ejecuta emuladores, setup, Playwright y cleanup con código de salida propagado.

- [ ] **Step 1: Escribir la prueba de configuración local.**

Comprobar que el reporte se dirige a `qa/reports`, los resultados a `qa/test-results` y el servidor esperado es `npm run dev` en `http://127.0.0.1:9002`.

- [ ] **Step 2: Crear `playwright.config.ts`.**

Configurar `testDir: "./tests/e2e"`, `baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:9002"`, un worker, `trace: "retain-on-failure"`, `screenshot: "only-on-failure"`, reporter HTML en `qa/reports` y `webServer` con `npm run dev`, `reuseExistingServer: false` y las variables públicas de emulator activas para el servidor local.

- [ ] **Step 3: Añadir setup y cleanup al comando local.**

Agregar scripts:

```json
"test:e2e:local": "firebase emulators:exec --only auth,firestore --project demo-coctels-e2e \"npx tsx scripts/e2e-local-state.ts && npx playwright test\""
```

El setup debe ejecutarse antes de Playwright y la limpieza debe estar en un `try/finally` del runner para ejecutarse también si Playwright retorna error. El runner no debe invocar `firebase deploy` ni aceptar un proyecto remoto como destino de limpieza.

- [ ] **Step 4: Adaptar la suite E2E a estado local.**

Cambiar `baseURL` para usar el valor local cuando no exista `E2E_BASE_URL`. Resolver las credenciales con prioridad `process.env.E2E_*` y fallback a `loadLocalE2EState()`. Usar `local.test` como dominio de registro local y conservar los `skip` para ejecuciones externas incompletas.

- [ ] **Step 5: Ejecutar primero la suite en modo seguro sin cleanup.**

Run: `npm run test:e2e:local` con `E2E_CLEANUP=false`.

Expected: los tres escenarios ejecutan contra emuladores y el reporte HTML se genera en `qa/reports`; si falla, conservar `qa/test-results` para diagnóstico.

- [ ] **Step 6: Ejecutar con cleanup explícito.**

Run: `E2E_CLEANUP=true E2E_CLEANUP_CONFIRM=DELETE_E2E_DATA npm run test:e2e:local`

En PowerShell establecer las variables con `$env:E2E_CLEANUP="true"` y `$env:E2E_CLEANUP_CONFIRM="DELETE_E2E_DATA"` antes del comando. Confirmar que el cleanup rechaza un host no loopback.

- [ ] **Step 7: Verificar y commit.**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run lint`

Run: `npm run build`

Commit: `git add playwright.config.ts package.json tests/e2e/auth-checkout-admin.spec.ts tests/lib/playwright-config.test.ts .gitignore && git commit -m "test: ejecutar E2E contra emuladores locales"`

### Task 4: Ejecutar reglas Firestore reales en el emulador

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.mts`
- Modify: `tests/firestore-rules.test.ts`
- Create: `tests/firestore-rules-emulator.test.ts`
- Create: `scripts/run-firestore-rules-tests.ts`

**Interfaces:**
- `scripts/run-firestore-rules-tests.ts` arranca el emulador Firestore en loopback, carga `firestore.rules`, ejecuta la suite y propaga el código de salida.
- `tests/firestore-rules-emulator.test.ts` usa `initializeTestEnvironment`, `assertSucceeds` y `assertFails` de `@firebase/rules-unit-testing`.

- [ ] **Step 1: Añadir el runner de reglas y dependencia de test.**

Agregar `@firebase/rules-unit-testing` como dependencia de desarrollo y excluir `tests/firestore-rules-emulator.test.ts` del `npm test` normal si necesita un emulador activo. El script específico será el único que la ejecute.

- [ ] **Step 2: Escribir casos de reglas contra el emulador.**

Crear contexts autenticados para cliente, staff y admin. Verificar lectura/escritura del propio perfil, acceso cruzado denegado, lectura de pedidos propios, creación directa de pedidos denegada, escritura de roles denegada para staff y acceso administrativo condicionado al claim booleano estricto.

- [ ] **Step 3: Ejecutar la suite en rojo y confirmar conexión real.**

Run: `npm run test:firestore-rules`

Expected: la ejecución falla inicialmente si la dependencia, runner o reglas no están configurados; el mensaje debe indicar el primer contrato inválido, no un skip silencioso.

- [ ] **Step 4: Implementar el runner loopback.**

Usar `firebase emulators:exec --only firestore --project demo-coctels-e2e` y establecer `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`. Cargar el archivo `firestore.rules` desde la raíz y destruir el entorno de reglas al terminar.

- [ ] **Step 5: Mantener el test estático como contrato complementario.**

Conservar `tests/firestore-rules.test.ts` para detectar eliminación accidental de bloques críticos, pero documentar que solo la suite del emulador puede declarar comportamiento permitido o denegado.

- [ ] **Step 6: Verificar y commit.**

Run: `npm run test:firestore-rules`

Run: `npm test`

Run: `npm run typecheck`

Commit: `git add package.json package-lock.json vitest.config.mts tests/firestore-rules.test.ts tests/firestore-rules-emulator.test.ts scripts/run-firestore-rules-tests.ts && git commit -m "test: validar reglas Firestore en emulador"`

### Task 5: Documentar el flujo y cerrar la verificación del bloque

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/superpowers/reports/2026-08-04-auth-clientes-admin.md`
- Modify: `.gitignore`

**Interfaces:**
- Documentación produce los comandos `npm run test:firestore-rules` y `npm run test:e2e:local`.
- El reporte distingue tests unitarios, reglas emulator, E2E browser local, responsive no ejecutado y riesgos de dependencias.

- [ ] **Step 1: Documentar requisitos locales.**

Indicar instalación de Firebase CLI, Java requerido por Emulator Suite, instalación de dependencias, puertos loopback, variables permitidas y la prohibición de usar `firebase deploy` o migraciones en este flujo.

- [ ] **Step 2: Documentar artefactos no versionados.**

Confirmar que `.tmp/e2e`, `qa/reports`, `qa/test-results` y logs de emulator no aparecen en `git status`.

- [ ] **Step 3: Actualizar el reporte de release con evidencia real.**

Añadir comandos, cantidades de tests, número de escenarios E2E ejecutados, resultado de reglas y cualquier fallo. No convertir skips, builds o tests unitarios en afirmación de E2E aprobado.

- [ ] **Step 4: Ejecutar la verificación completa.**

Run: `npm test`

Run: `npm run test:firestore-rules`

Run: `npm run test:e2e:local`

Run: `npm run typecheck`

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

- [ ] **Step 5: Revisar seguridad y estado Git.**

Comprobar que no se versionan `.env.local`, estado E2E, reportes, tokens ni credenciales; ejecutar `npm audit --omit=dev --audit-level=high` y dejar sus vulnerabilidades como riesgo separado si no se resuelven dentro de este bloque.

- [ ] **Step 6: Commit final del bloque.**

Commit: `git add AGENTS.md README.md docs/superpowers/reports/2026-08-04-auth-clientes-admin.md .gitignore && git commit -m "docs: documentar QA local con emuladores"`

## Self-Review del Plan

- Cobertura: cada sección de la especificación tiene tareas para emuladores, SDK web, Admin SDK, datos E2E, Playwright, reglas, seguridad, documentación y criterios de aceptación.
- Seguridad: no hay pasos de deploy ni migración remota; la inicialización sin certificado está condicionada a bandera y hosts loopback.
- Aislamiento: `npm test` sigue separado de Playwright y los artefactos se mantienen fuera de Git.
- Verificación: cada tarea termina con una prueba específica y el bloque termina con la suite completa.
