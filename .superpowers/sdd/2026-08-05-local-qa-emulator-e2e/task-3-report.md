# Reporte Task 3

## Estado

`DONE_WITH_CONCERNS`

La configuración, el runner, el fallback al estado local y la limpieza segura están implementados. La ronda de corrección ejecutó los tres escenarios E2E reales contra emuladores locales y los tres pasaron. Queda una concern de dependencias vulnerables reportada por `npm audit`.

## Archivos

- `playwright.config.ts`: configuración local, reporter HTML, resultados, servidor Next y hosts del emulador propagados desde el entorno.
- `package.json`: comando `test:e2e:local`.
- `scripts/e2e-local-runner.ts`: selección de puertos loopback libres, configuración temporal de Firebase con reglas/índices del repositorio, setup, Playwright, cleanup en `finally` y propagación de salida.
- `tests/e2e/auth-checkout-admin.spec.ts`: URL local y fallback de credenciales desde `loadLocalE2EState()` sin duplicar usuarios.
- `tests/e2e/cleanup-safety.ts`: validación loopback con rango de puertos 1-65535.
- `tests/lib/playwright-config.test.ts`: pruebas focalizadas de configuración.
- `tests/lib/e2e-local-runner.test.ts`: pruebas de puertos, configuración temporal y propagación de hosts.
- `tests/lib/e2e-cleanup.test.ts`: caso negativo de puerto inválido.
- `.gitignore`: estado temporal, reportes y resultados E2E.
- `src/firebase/emulators.ts`, `src/firebase/index.ts`: hosts públicos configurables, defaults loopback y validación fail-closed.
- `scripts/e2e-local-state.ts`, `tests/lib/e2e-local-state.test.ts`: fallback de imágenes E2E permitido y permisos del staff local.
- `src/lib/firestore/orders.ts`: omisión de `reason` indefinido al crear auditoría de cambio de estado.

## Verificación

- `npm test -- tests/lib/playwright-config.test.ts`: 3 tests passed.
- `npm test -- tests/lib/e2e-cleanup.test.ts`: 6 tests passed, incluido host loopback no válido.
- `npm test -- tests/lib/playwright-config.test.ts tests/lib/e2e-cleanup.test.ts tests/lib/e2e-local-state.test.ts tests/lib/e2e-local-runner.test.ts tests/lib/firebase-emulators.test.ts`: 23 tests passed.
- `npm run test:e2e:local`: exit code 0; Firebase Emulator inició con configuración temporal y puertos loopback libres aunque `127.0.0.1:8080` estaba ocupado por un proceso ajeno. Playwright ejecutó 3/3 escenarios, 3 passed, 0 skipped; cleanup terminó y `.tmp/e2e/local-state.json` quedó ausente. La salida no imprimió cuerpos HTTP ni tokens de Auth.
- `npm test`: 42 archivos passed, 1 skipped; 198 tests passed, 4 skipped.
- `npm run typecheck`: passed, ejecutado aislado después de `next build` para evitar una carrera sobre `.next/types`.
- `npm run lint`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- `firebase --version`: `15.25.1` disponible.
- `java -version`: OpenJDK `21.0.12` disponible.
- `npm audit --audit-level=high`: 66 vulnerabilidades reportadas, 13 high; algunas sin fix disponible. No se ejecutó `npm audit fix`.

## Review Fix Round 1

- La colisión de puertos fijos se resolvió reservando dos puertos loopback libres antes de `firebase emulators:exec`; no se detuvieron ni modificaron procesos ajenos.
- Se genera un `firebase.json` temporal fuera del repositorio. Sus rutas `firestore.rules` y `firestore.indexes.json` son absolutas y apuntan al repositorio; no se usa `firebase deploy`.
- Los hosts privados y públicos llegan a setup, Next y Playwright. El SDK cliente usa referencias estáticas `NEXT_PUBLIC_*`, defaults `127.0.0.1:8080`/`127.0.0.1:9099` y validación loopback estricta.
- El fallo funcional de Auth se corrigió al dejar de consultar variables privadas desde el bundle cliente. El fallo de autorización del escenario se corrigió aislando los permisos del staff E2E. El fallo de historial se corrigió adaptando el selector al enlace real `Ver detalle`.
- El `500` al confirmar pedidos se debió a `reason: undefined` en una auditoría Firestore; ahora el campo opcional se omite cuando no existe.
- El fallback de imágenes queda limitado al setup E2E y solo devuelve valores aceptados por `isAllowedCatalogImage`. El estado local no se carga si existe `E2E_BASE_URL`.
- Los diagnostics browser registran método/status/pathname o el tipo de error, nunca payloads, query strings, tokens o credenciales. `firebase emulators:exec` usa `QUIET` para no mostrar enlaces de verificación con tokens efímeros.

## Seguridad y alcance

- El runner usa únicamente el proyecto fijo `demo-coctels-e2e`, hosts loopback y confirmación explícita de cleanup.
- No se invocó `firebase deploy`, no hubo migraciones ni destino remoto de limpieza.
- Las credenciales son generadas por `prepareLocalE2EState()` y no se añadieron credenciales reales.
- Se preservan skips visibles para ejecuciones externas incompletas.
- Los artefactos `.tmp/e2e`, `qa/reports` y `qa/test-results` permanecen ignorados por Git.

## Commit

`88d9499 test: ejecutar E2E contra emuladores locales`

Commit de esta ronda: `24b812d fix: robustecer E2E local con puertos dinámicos`.
