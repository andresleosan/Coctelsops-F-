# Reporte de Release: Auth, Clientes y Panel Administrativo

Fecha: 2026-08-04
Task 10 revisada: base `82b4ef3`, head `12a8a37`
Rango amplio de implementación previa: `d63b23b..82b4ef3`
Alcance: Task 10, verificación y documentación del trabajo de autenticación, cuentas, checkout seguro, operaciones administrativas y migración idempotente.

## Cambios de Task 10

- README actualizado con requisitos, variables públicas y privadas, proveedores de Auth, despliegue de reglas/índices, bootstrap de administrador, seed de catálogo y migración.
- `AGENTS.md` añadido con comandos y límites operativos verificables.
- `firebase.json` añadido para referenciar `firestore.rules` y `firestore.indexes.json` sin credenciales.
- Playwright añadido como dependencia de desarrollo y `npm run test:e2e` limitado a `tests/e2e` para no descubrir los tests de Vitest.
- `tests/e2e/auth-checkout-admin.spec.ts` cubre registro, barrera de verificación, login, perfil, checkout autenticado, historial, navegación limitada, actualización de estado, logout y mock de navegación a WhatsApp.

## Correcciones posteriores de revisión

- El escenario administrativo crea su propio pedido mediante un helper local; ya no depende del test de cliente, de `orderId` global ni de ejecución serial.
- La limpieza E2E es opt-in (`E2E_CLEANUP=true`) y solo permite borrar pedidos y usuarios de registro generados cuando `FIREBASE_PROJECT_ID` coincide con `E2E_CLEANUP_PROJECT_ID` y el ID contiene `-e2e`.

## Verificación automatizada

Los comandos obligatorios se ejecutaron desde `C:\Users\USER\AppData\Local\Temp\opencode\coctels-ops-auth-admin`.

### `npm test`

Resultado: **PASS**, código de salida `0`.

```text
Test Files  31 passed (31)
Tests       147 passed (147)
Duration    11.26s (transform 1.87s, setup 13.04s, import 10.70s, tests 353ms, environment 74.37s)
```

El script ejecuta `vitest run --exclude tests/e2e/**` para separar Vitest de Playwright.

### `npm run typecheck`

Resultado: **PASS**, código de salida `0`.

Salida relevante:

```text
> nextn@0.1.0 typecheck
> tsc --noEmit
```

### `npm run lint`

Resultado: **PASS**, código de salida `0`, con warnings que deben permanecer visibles en la decisión de release.

Warnings exactos:

```text
`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .

./src/app/layout.tsx
26:9  Warning: Custom fonts not added in `pages/_document.js` will only load for a single page. This is discouraged. See: https://nextjs.org/docs/messages/no-page-custom-font  @next/next/no-page-custom-font

./src/app/page.tsx
5:52  Warning: 'Star' is defined but never used.  @typescript-eslint/no-unused-vars
16:9  Warning: 'deliveryImage' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/firebase/firestore/use-memo-firebase.tsx
7:10  Warning: React Hook useMemo received a function whose dependencies are unknown. Pass an inline function instead.  react-hooks/exhaustive-deps

./src/hooks/use-toast.ts
21:7  Warning: 'actionTypes' is assigned a value but only used as a type.  @typescript-eslint/no-unused-vars
```

### `npm run build`

Resultado: **PASS**, código de salida `0`.

El build compiló correctamente, generó las 47 páginas estáticas/dinámicas esperadas y mostró los mismos warnings de ESLint listados arriba. También mostró el aviso de migración de `next lint`; no hubo errores de compilación, tipos ni generación de páginas.

### Instalación de dependencias

`npm install` terminó con código `0`, pero dejó estos warnings exactos:

```text
npm warn ERESOLVE overriding peer dependency
npm warn Could not resolve dependency:
npm warn peerOptional @types/node@"^20.19.0 || >=22.12.0" from vite@8.2.0
npm warn Conflicting peer dependency: @types/node@26.1.2
npm warn allow-scripts 6 packages have install scripts not yet covered by allowScripts
```

La instalación también reportó `94 vulnerabilities (2 low, 64 moderate, 26 high, 2 critical)`; el detalle y el riesgo están en la sección de seguridad.

### `npm run test:e2e`

Resultado técnico: código de salida `0`, **3 tests skipped**.

```text
Running 3 tests using 1 worker
3 skipped
```

No se ejecutó interacción browser real: el repositorio tiene Playwright MCP deshabilitado y no se configuró `E2E_BASE_URL` ni credenciales efímeras. Los skips son deliberados, no evidencia de que el flujo E2E haya pasado. Para ejecutarlos se requieren además `E2E_CUSTOMER_EMAIL`, `E2E_CUSTOMER_PASSWORD`, `E2E_STAFF_EMAIL`, `E2E_STAFF_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` y `E2E_REGISTRATION_DOMAIN` cuando aplique.

## Responsive y emuladores

- La verificación manual a 375px y desktop para login, checkout, historial, sidebar, detalle de pedido, formulario de producto y tablas **no se ejecutó** por la limitación browser indicada arriba. No se presentan capturas ni se afirma ausencia de overflow.
- La suite de reglas de Firestore contra Firebase Emulator Suite **no se ejecutó** porque no había emulador configurado y la aplicación no apunta automáticamente a emuladores.
- Las pruebas Vitest incluyen cobertura de validación, autorización, checkout, operaciones y migración; no sustituyen la verificación visual ni la suite de reglas en emulador.

## Migración y operación

- La implementación previa conserva `orders`, copia a `pedidos` con IDs estables, omite destinos migrados y falla ante discrepancias.
- Las pruebas automatizadas de migración forman parte de los 147 tests pasados.
- No se ejecutó migración real ni seed real contra Firebase. No había credenciales operativas, backup verificado ni aprobación del operador.
- Antes de producción se debe revisar el proyecto Firebase, desplegar reglas/índices, verificar backup, ejecutar migración en ventana aprobada y correr `scripts/verify-migration.ts`.

## Riesgos y trabajo diferido

- `npm audit` reporta **94 vulnerabilities (2 low, 64 moderate, 26 high, 2 critical)**. El reporte incluye vulnerabilidades transitivas de Next.js, Firebase/Google Cloud, Genkit, `websocket-driver` y otras dependencias. `npm audit fix --force` propone cambios potencialmente incompatibles, por lo que no se aplicó automáticamente.
- `next lint` está deprecado y debe migrarse al flujo ESLint antes de actualizar a Next.js 16.
- Permanecen los cinco warnings de lint indicados arriba.
- Playwright MCP está deshabilitado; E2E browser y responsive quedan como riesgo de release hasta ejecutarse en un entorno habilitado.
- No hay pasarela de pago. La confirmación por WhatsApp solo genera una navegación preparada y mockeada en la suite; no se usa la API oficial ni se envían mensajes automáticamente.
- No se desplegó producción. No se aplicó migración de producción.

## Seguridad

- Task 10 no añadió credenciales reales ni secretos; la suite usa únicamente variables de entorno y valores de prueba no versionados.
- Las reglas e índices se publican mediante Firebase CLI y las rutas administrativas mantienen la autorización implementada en tareas anteriores.
- La auditoría de dependencias es un bloqueo/riesgo abierto de release y requiere triage separado. No se ocultó ni se corrigió con una actualización forzada durante esta tarea.

## Decisión

**No declarar release E2E aprobada.** El estado estático es verificable y verde, pero la aprobación completa queda condicionada a ejecutar browser E2E, responsive manual y reglas de Firestore con un entorno configurado, además de tratar las vulnerabilidades de dependencias.
