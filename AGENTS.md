# Instrucciones del repositorio

## Comandos

- Instalar dependencias: `npm install`.
- Verificar Firebase CLI: `firebase --version`.
- Verificar Java requerido por Firebase Emulator Suite: `java -version` (Java 11 o superior).
- Desarrollo: `npm run dev`; inicia Next.js en `http://localhost:9002`.
- Tests unitarios e integración: `npm test`.
- Verificar tipos: `npm run typecheck`.
- Lint: `npm run lint`.
- Build: `npm run build`.
- Browser E2E: `npm run test:e2e`, solo con `E2E_BASE_URL`, credenciales efímeras y navegadores Playwright instalados.

No hay credenciales versionadas. Copia `.env.example` a `.env.local` para el cliente y configura `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` únicamente en el entorno del servidor o de los scripts.

## Estructura

- `src/app/` contiene las rutas App Router, incluyendo tienda, checkout, cuenta y administración.
- `src/components/` contiene UI reutilizable y guards de autenticación/permisos.
- `src/context/cart-context.tsx` mantiene el carrito global.
- `src/firebase/` encapsula Firebase del navegador; `src/lib/firebase-admin.ts` es solo servidor.
- `src/lib/firestore/` contiene repositorios y reglas de negocio de Firestore.
- `scripts/` contiene bootstrap de administrador, seed de catálogo y migración idempotente.
- `tests/` contiene Vitest; `tests/e2e/` contiene Playwright y queda fuera de `npm test`.

## Firebase y operaciones

Antes de publicar reglas o índices revisa el proyecto seleccionado y ejecuta `firebase deploy --project "$env:FIREBASE_PROJECT_ID" --only firestore:rules,firestore:indexes`. Para el primer administrador usa `npx tsx scripts/set-admin.ts <UID>`; para el catálogo usa `npx tsx scripts/seed-catalog.ts`.

No ejecutes `scripts/migrate-orders.ts` ni `scripts/verify-migration.ts` contra producción sin backup verificable, credenciales configuradas y aprobación explícita del operador. La migración nunca debe borrar automáticamente `orders`.

## QA local con emuladores

Antes de ejecutar las suites locales, instala las dependencias con `npm install` y verifica que Firebase CLI y Java estén disponibles:

```powershell
firebase --version
java -version
```

Firebase Emulator Suite requiere Java 11 o superior. Los runners seleccionan puertos loopback libres dinámicamente; no asumas los puertos fijos de desarrollo ni detengas procesos ajenos.

Los comandos oficiales del flujo local son:

- `npm run test:firestore-rules`: levanta un Firestore Emulator temporal, carga `firestore.rules` e índices del repositorio, ejecuta los cinco casos reales de autorización y elimina su configuración temporal al terminar. Los fixtures tienen IDs namespaced y cada corrida elimina solo sus documentos.
- `npm run test:e2e:local`: levanta Auth y Firestore Emulator en puertos loopback dinámicos, prepara usuarios y estado E2E efímeros, ejecuta los tres escenarios Playwright y limpia los usuarios/pedidos generados, el estado local y la configuración temporal aun si la suite falla.

La suite E2E genera el reporte HTML en `qa/reports` y resultados, screenshots o traces en `qa/test-results`; el estado temporal queda en `.tmp/e2e`. Estas rutas y los logs del Emulator Suite están ignorados por Git. No se versionan estados, reportes, screenshots, traces, tokens ni credenciales.

Variables permitidas para este flujo local: `FIREBASE_EMULATORS`, `NEXT_PUBLIC_FIREBASE_EMULATORS`, `FIREBASE_PROJECT_ID=demo-coctels-e2e`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST`, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, `E2E_CLEANUP=true`, `E2E_CLEANUP_CONFIRM=DELETE_E2E_DATA` y `FIRESTORE_RULES_EMULATOR`. Los hosts deben ser `localhost` o `127.0.0.1` con puerto válido; no uses credenciales reales.

Este flujo es exclusivamente local: no ejecuta `firebase deploy`, seed, migraciones ni comandos contra Firebase remoto. Las operaciones remotas requieren revisión del proyecto, backup cuando corresponda y aprobación explícita del operador.

## Cambios

- Mantén la interfaz y documentación en español.
- No añadas secretos reales a código, documentación, fixtures o tests.
- Después de cambios ejecuta como mínimo `npm test` y `npm run typecheck`; para UI/configuración ejecuta también `npm run lint` y `npm run build`.
- Reporta vulnerabilidades de dependencias, fallos de comandos y la indisponibilidad de browser E2E como riesgos de release; no los ocultes.
