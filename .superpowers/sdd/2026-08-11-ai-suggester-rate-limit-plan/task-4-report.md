# Task 4 Report: Concurrencia y Emulator

## Estrategia

- Se agregó una prueba de integración de Vitest contra Firestore Emulator.
- La prueba restringe `FIRESTORE_EMULATOR_HOST` a `localhost` o `127.0.0.1` con puerto válido.
- Ejecuta diez llamadas concurrentes a `reserveAIRateLimit` con el mismo `digest` y timestamp.
- Verifica exactamente cinco resultados `true`, cinco `false` y `count` igual a `5`.
- Usa un digest único por ejecución y elimina el documento creado en `afterEach`.
- El runner de reglas ejecuta tanto la suite existente como la nueva prueba, y define `FIREBASE_EMULATORS`, `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_EMULATOR_HOST` y `FIRESTORE_EMULATOR_HOST` para el proceso de Vitest.
- No se modificó `src/lib/ai/ai-rate-limit.ts`: la concurrencia real no demostró un bug en la implementación transaccional.

## Comandos y resultados

### `npm run test:firestore-rules`

- Resultado: código de salida `0`.
- Vitest: `Test Files 2 passed (2)`.
- Tests: `Tests 6 passed (6)`.
- Incluye la prueba `reserva exactamente cinco de diez solicitudes concurrentes`.
- El Firestore Emulator se inició en loopback y se apagó correctamente al finalizar.

### `npm run test:e2e:local`

- Resultado: código de salida `0`.
- Playwright: `5 passed` usando un worker.
- El runner local inició y apagó sus emuladores y servidores al finalizar.

## Limpieza

- No quedaron archivos bajo `.tmp/e2e/` después de las pruebas.
- La prueba de rate limit confirmó que su documento técnico no existe después de borrarlo.
- Se verificaron los procesos activos: los procesos persistentes identificables pertenecen a otro workspace (`donaciones-venezuela`), por lo que no se detuvieron ni se borró estado ajeno.

## Warnings no bloqueantes

- Firestore mostró `MetadataLookupWarning: fetch failed` durante la suite local; las pruebas pasaron y no hubo acceso a Firebase remoto.
- E2E mostró un warning deprecado de `punycode` y warnings de accesibilidad de un `DialogContent` preexistente; no afectaron el resultado de las cinco pruebas.
