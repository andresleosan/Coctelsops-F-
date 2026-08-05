# Instrucciones del repositorio

## Comandos

- Instalar dependencias: `npm install`.
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

## Cambios

- Mantén la interfaz y documentación en español.
- No añadas secretos reales a código, documentación, fixtures o tests.
- Después de cambios ejecuta como mínimo `npm test` y `npm run typecheck`; para UI/configuración ejecuta también `npm run lint` y `npm run build`.
- Reporta vulnerabilidades de dependencias, fallos de comandos y la indisponibilidad de browser E2E como riesgos de release; no los ocultes.
