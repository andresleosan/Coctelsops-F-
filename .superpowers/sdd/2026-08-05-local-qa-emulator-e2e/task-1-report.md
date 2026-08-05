# Task 1 — Reporte: Configurar el modo explícito de Firebase Emulator

## Estado

**DONE_WITH_CONCERNS**

## Commits

- `da53dbe` — `test: preparar modo local de Firebase Emulator` (rama `master`, sobre `2ba23c4`)

## Resumen de tests

`vitest run tests/lib/firebase-emulators.test.ts tests/lib/server-env.test.ts` → 2 archivos, 15 tests pasados (0 fallos).

## Archivos tocados

- **Create** `src/firebase/emulators.ts` — `shouldUseFirebaseEmulators()` y `assertLoopbackEmulatorHosts()`, parser loopback estricto.
- **Modify** `src/firebase/index.ts` — `initializeFirebase()` conecta Auth y Firestore a emuladores (idempotente con flag de módulo `emulatorsConnected`).
- **Modify** `src/lib/firebase-admin.ts` — `getAdminApp()` inicializa sin certificado solo cuando `FIREBASE_EMULATORS === "true"` y hosts son loopback; fuera de ese caso conserva `requireEnv` para `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`.
- **Modify** `firebase.json` — sección `emulators`: auth 9099, firestore 8080, sin `host` (default loopback), `singleProjectMode: true`.
- **Modify** `.env.example` — documentación + `FIREBASE_EMULATORS=false`, `NEXT_PUBLIC_FIREBASE_EMULATORS=false`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
- **Create** `tests/lib/firebase-emulators.test.ts` — 13 tests cubriendo bandera explícita, parser loopback y lectura directa de `process.env`.

## Decisiones implementadas (ambigüedades resueltas)

- **Parser loopback**: acepta exactamente `localhost:<puerto>` y `127.0.0.1:<puerto>` con puerto entre 1 y 65535. Cualquier otro host (incluido `0.0.0.0`), puerto fuera de rango, sin puerto, o variable ausente → `Error` cuyo mensaje contiene la palabra "loopback".
- **`shouldUseFirebaseEmulators(environment?)`**: default `process.env` cuando no se pasa argumento; devuelve `true` solo si `NEXT_PUBLIC_FIREBASE_EMULATORS === "true"` Y ambos hosts pasan el parser.
- **Bandera servidor**: `FIREBASE_EMULATORS` (sin `NEXT_PUBLIC_`). **Bandera cliente**: `NEXT_PUBLIC_FIREBASE_EMULATORS`.
- **`firebase.json` emuladores**: auth 9099 y firestore 8080, ambos sin `host` (default loopback), más `singleProjectMode: true`.
- **Idempotencia del SDK web**: flag de módulo `emulatorsConnected` evita reconectar durante hot reload de Next.js.
- **Admin**: `isServerEmulatorMode()` reutiliza `assertLoopbackEmulatorHosts` (DRY); solo en modo emulator se llama `initializeApp({ projectId })` sin `cert`.

## Comandos ejecutados (con salida real)

### 1. Test de fallo inicial (Step 2)
`npm test -- --run tests/lib/firebase-emulators.test.ts`
```
 FAIL  tests/lib/firebase-emulators.test.ts [ tests/lib/firebase-emulators.test.ts ]
Error: Failed to resolve import "@/firebase/emulators" from "tests/lib/firebase-emulators.test.ts". Does the file exist?
```
→ Fallo esperado (el módulo no existía aún).

### 2. Test tras implementar el parser (Step 3)
`npm test -- --run tests/lib/firebase-emulators.test.ts`
```
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

### 3. Tests finales del brief (Step 7)
`npm test -- --run tests/lib/firebase-emulators.test.ts tests/lib/server-env.test.ts`
```
 Test Files  2 passed (2)
      Tests  15 passed (15)
   Duration  2.22s
```

### 4. Typecheck
`npm run typecheck` (tsc --noEmit)
→ Sin salida, exit 0. Limpio.

### 5. Lint
`npm run lint` (eslint . --ignore-pattern next-env.d.ts --max-warnings=0)
→ Sin errores ni warnings. Limpio.

### 6. Build
`npm run build` (next build)
```
 ✓ Compiled successfully in 3.8s
```
→ Build completo, todas las rutas generadas (tienda, checkout, cuenta, admin, API). Sin errores.

## Hallazgos

- **`connectFirestoreEmulator` viene de `firebase/firestore`**, no de `firebase/auth` (no es un omnibus). Corregí el import en `src/firebase/index.ts` antes del typecheck.
- **`firebase-admin/firestore` vs `firebase/firestore`**: el SDK web y el admin tienen APIs separadas; el admin no necesita `connect*Emulator` porque detecta `FIRESTORE_EMULATOR_HOST`/`FIREBASE_AUTH_EMULATOR_HOST` del entorno automáticamente. Por eso el admin solo necesita `initializeApp({ projectId })` sin certificado.
- **Operadores de shell en PowerShell**: `head`/`&&` no existen en PowerShell 5.1; usé `Select-Object` y `if ($?)`. No afecta al repositorio.
- **CRLF**: Git avisó que `emulators.ts` y `firebase-emulators.test.ts` (LF) serán normalizados a CRLF en checkout. Inocuo; el `.gitattributes` del repo (si existe) o el `core.autocrlf` maneja esto.

## Concerns (no bloqueantes)

1. **Falta el comando local de emuladores.** El brief Step 6 menciona que las banderas "solo se activan en el comando local", pero dicho comando (p.ej. `npm run emulators`) pertenece a una tarea posterior del bloque, no a la Task 1. `.env.example` documenta esta intención y los defaults son `false`, así que no hay riesgo de activación accidental en builds normales. Tarea siguiente deberá crear el script orchestrador.
2. **No hay test directo de `src/lib/firebase-admin.ts`** que cubra la rama de inicialización sin certificado. El brief no lo exige (solo pide testear `emulators.ts`), y añadirlo requeriría mockear `firebase-admin/app` (pesado). La cobertura del parser loopback ya vive en `emulators.test.ts` y el admin lo reutiliza. Se recomienda cubrir la rama admin en una tarea posterior de tests de integración contra el emulador.
3. **CRLF normalization.** Los dos archivos nuevos quedaron con LF en el commit; en Windows pueden verse normalizados a CRLF en futuros checkouts. Funcionalmente irrelevante.

## Resumen final

Todas las restricciones globales se respetaron: sin credenciales de producción, sin deploy remoto, bandera off por defecto, interfaz en español, sin secretos en tests. Las verificaciones mínimas (`npm test`, `npm run typecheck`) más las extendidas para UI/configuración (`npm run lint`, `npm run build`) pasaron limpias. Commit `da53dbe` creado sobre `master`, sin push.

## Review Fix Round 1

### Hallazgos corregidos

1. **CRITICAL — modo Admin emulator fail-closed:** `src/lib/firebase-admin.ts` ya no captura el error de `assertLoopbackEmulatorHosts()` cuando `FIREBASE_EMULATORS === "true"`. Los hosts inválidos o ausentes lanzan un `Error` con `loopback` antes de consultar el cache de Admin, `getApps()`, `requireEnv()`, `cert()` o `initializeApp()`. Solo después de validar ambos hosts se permite la inicialización Admin sin certificado.
2. **MINOR — regresión automatizada:** `tests/lib/firebase-emulators.test.ts` ahora aísla `firebase-admin/app`, `server-only` y `requireEnv`. Con bandera server emulator activa y `FIRESTORE_EMULATOR_HOST=firestore.example.com:8080`, verifica simultáneamente que falla con `loopback` y que `requireEnv`, `cert` e `initializeApp` no son llamados. El contrato de producción no se relaja: la ruta sin `FIREBASE_EMULATORS === "true"` sigue usando certificado y variables de credenciales.
3. **Evidencia de suite completa:** se ejecutó `npm test` sin filtros y se registró debajo su salida real.

### Ciclo TDD de la corrección

#### RED — regresión antes de corregir producción

`npm test -- --run tests/lib/firebase-emulators.test.ts`
```
 ❯ tests/lib/firebase-emulators.test.ts (14 tests | 1 failed) 551ms
     × falla cerrado con host remoto sin consultar credenciales 547ms

 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

Fallo esperado: la implementación anterior terminaba en `credential lookup: FIREBASE_PROJECT_ID` en lugar de fallar con `loopback`.

#### GREEN — regresión después de corregir producción

`npm test -- --run tests/lib/firebase-emulators.test.ts`
```
 Test Files  1 passed (1)
      Tests  14 passed (14)
```

#### Suite completa

`npm test`
```
 Test Files  39 passed (39)
      Tests  176 passed (176)
   Duration  13.91s
```

#### Typecheck

`npm run typecheck`
```
> nextn@0.1.0 typecheck
> tsc --noEmit
```

Salida sin errores, exit 0. Se repitió después del build y en ejecución secuencial para evitar interferencia sobre `.next/types`.

#### Lint

`npm run lint`
```
> nextn@0.1.0 lint
> eslint . --ignore-pattern next-env.d.ts --max-warnings=0
```

Salida sin errores ni warnings, exit 0.

#### Build

`npm run build`
```
 ✓ Compiled successfully in 5.6s
 ✓ Generating static pages (48/48)
```

Build completo, exit 0.

#### Nota de ejecución paralela

En una primera ejecución paralela de `npm run typecheck`, `npm run lint` y `npm run build`, el typecheck falló con `TS6053` para archivos de `.next/types` que estaban siendo regenerados por `next build`. No es un fallo de código: la repetición secuencial posterior de `npm run typecheck` terminó sin salida ni errores. Lint y build pasaron en esa ejecución paralela.

### Estado de concerns tras la ronda

- El concern de ausencia de prueba Admin queda cerrado por la regresión aislada de esta ronda.
- Permanece el concern no bloqueante de que el comando local orchestrador de emuladores pertenece a una tarea posterior del bloque; las banderas continúan en `false` por defecto.
- Permanece el concern no funcional de normalización CRLF en archivos nuevos en Windows.

### Commit de la ronda

- `b490fb3` — `fix: cerrar modo admin de Firebase Emulator`
