# Plataforma y datos Cloudflare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir Firestore por D1 conservando autenticación, autorización e integridad operativa, y dejar la migración reproducible con datos sintéticos.

**Architecture:** Bindings detrás de una interfaz servidor; repositorios SQL con batches atómicos y comprobación de revisiones. Las herramientas Node privilegiadas de Firebase quedan fuera del grafo de imports del Worker.

**Tech Stack:** Next.js 16.3.8, OpenNext, Wrangler, D1, R2, Firebase Auth, jose compatible con Web Crypto, Vitest, Auth Emulator.

**Spec:** [Diseño aprobado](../specs/2026-10-18-cloudflare-catalogo-opsy-design.md). [Plan coordinador y restricciones comunes](2026-10-18-cloudflare-catalogo-opsy-plan.md).

## Global Constraints

Se heredan todas las restricciones del coordinador. «La aplicación final no tendrá fallback operativo a Firestore.» «Se mantienen IDs y Firebase UID existentes». «D1 persiste enteros en centavos de COP (escala 100), dentro de rango seguro.» «No se crean cuentas ni recursos remotos durante la implementación local.»

## Review Focus

P2 prueba rollback real, no solo rechazo HTTP. P3 prueba rotación de certificados, proyecto ajeno y sync que no reactive cuentas. P5 prueba concurrencia de stock/cupón/idempotencia. P6 prueba conflictos entre `orders`/`pedidos` y cleanup que nunca salga del directorio efímero. Los cinco riesgos globales tienen pruebas propietarias en el coordinador.

## Mapa de archivos y contratos

- `src/lib/cloudflare/env.ts`, `cloudflare-env.d.ts`: acceso servidor a `DB`, `CATALOG_IMAGES`, `ASSETS` y variables; cero imports cliente.
- `src/lib/db/{client,atomic,audit,money}.ts`: conexión, batches protegidos, sentencias de auditoría y conversión monetaria.
- `src/lib/db/{users,roles,products,categories,configuration,notifications,promotions,inventory,orders}.ts`: sustitutos de sus homónimos en `src/lib/firestore/`.
- `src/lib/auth/firebase-token.ts`: verificación criptográfica; `verify-request.ts` y `permissions.ts` conservan su entrada pública.
- `scripts/lib/{migration-model,d1-target,auth-admin}.ts`: transformaciones puras, selección explícita del destino y SDK Admin Node; los ejecutables no importan módulos `server-only` de Next.
- `tests/d1/` y `vitest.d1.config.mts`: pruebas Node con D1/R2 reales locales; `tests/lib`/`api`/`components` conservan su configuración habitual.

## P1: Bindings y arnés local de Cloudflare

**Files:** crear `wrangler.jsonc`, `open-next.config.ts`, `cloudflare-env.d.ts`, `src/lib/cloudflare/env.ts`, `src/lib/db/client.ts`, `vitest.d1.config.mts`, `tests/d1/helpers.ts`, `tests/d1/runtime.test.ts`; modificar `next.config.ts`, `.gitignore`, `.env.example`, `package.json`, `pnpm-lock.yaml`, `vitest.config.mts`, `eslint.config.mjs`, `README.md`.

**Interfaces:** `getCloudflareEnv(): Promise<CloudflareEnv>`; `getDatabase(): Promise<D1Database>`; `createD1TestHarness(): Promise<{db: D1Database; images: R2Bucket; reset(): Promise<void>; dispose(): Promise<void>}>`. Este helper ejecuta el esquema local y no expone credenciales. Scripts nuevos: `test:d1`, `db:migrate:local`, `cf:build`, `cf:preview`; ninguno despliega.

- [ ] Preparar aislamiento conservando el estado actual y registrar baseline con `pnpm test`, `pnpm typecheck`, `pnpm lint` en entorno de prueba saneado; diferir build completo hasta P4/P6 para no consultar datos reales en prerender. Escribir `runtime.test.ts` con `expect(await db.prepare('SELECT 1 AS n').first('n')).toBe(1)` y put/get/remove de bytes R2 locales; afirmar que no se invoca red remota. Guardar toda persistencia de prueba bajo `.tmp/e2e/<runId>/cloudflare`.
- [ ] Ejecutar `pnpm exec vitest run --config vitest.d1.config.mts tests/d1/runtime.test.ts`; antes de crear el arnés debe fallar por ausencia de configuración/implementación, no por acceso a producción.
- [ ] Consultar docs/metadatos, fijar dependencias compatibles y auditoría; configurar OpenNext y bindings locales sin recursos remotos, `nodejs_compat`, fecha compatible verificada y assets/caché requeridos por esa versión. Mantener `image-hosts.ts` y servir imágenes optimizadas de origen R2 directamente con `images.unoptimized: true`, dimensiones/sizes explícitos; no activar por defecto optimización facturable adicional. El acceso local a bindings usa el mismo directorio de persistencia que Wrangler. Excluir `.dev.vars*`, `.wrangler/`, `.open-next/` y artefactos privados antes de crear archivos locales; exceptuar únicamente plantillas sin valores reales. Separar `tests/d1/**` de la suite jsdom. Añadir variables modelo/clave vacía y Auth público a plantilla; no exigir credenciales Admin al Worker. No elegir vinext automáticamente si falla OpenNext: documentar el fallo concreto.
- [ ] Ejecutar el test del paso 2 y `pnpm audit --prod --audit-level high`; debe pasar el binding local y no introducir vulnerabilidades altas sin revisar. El build completo Workers se exige en P6/R1, después de retirar las dependencias servidor incompatibles.
- [ ] Revisar diff y commit de los archivos de esta tarea: `build: prepare local Cloudflare runtime and bindings`.

## P2: Dinero, esquema y batches que revierten

**Files:** crear `migrations/0001_operations.sql`, `migrations/README.md`, `src/lib/db/money.ts`, `src/lib/db/atomic.ts`, `src/lib/db/audit.ts`, `tests/lib/money.test.ts`, `tests/d1/{schema,atomic}.test.ts`.

**Interfaces:** `toCopCentavos(value: string | number): number`, `fromCopCentavos(value: number): number`; `executeGuardedBatch(db: D1Database, input: {attemptId: string; predicate: D1PreparedStatement; writes: D1PreparedStatement[]}): Promise<void>`; `buildAuditStatement(db: D1Database, input: AuditInput, at: string): D1PreparedStatement`. El predicado es una sentencia interna que inserta una aserción, nunca SQL del usuario. `TransactionConflictError` identifica únicamente el guard fallido.

- [ ] Escribir `money_rejects_inexact_or_unsafe_values`: `expect(toCopCentavos('0.29')).toBe(29)`, `expect(toCopCentavos(4500)).toBe(450000)`, `expect(() => toCopCentavos('1.005')).toThrow()`. Añadir negativos monetarios no admitidos, NaN/infinito, overflow y round-trip exacto. Escribir `guard_failure_rolls_back_prior_write` y `audit_failure_rolls_back_all_mutations` sobre D1 local.
- [ ] Ejecutar `pnpm exec vitest run tests/lib/money.test.ts` y `pnpm test:d1 -- tests/d1/schema.test.ts tests/d1/atomic.test.ts`; observar los fallos antes de implementar.
- [ ] Crear tablas del diseño salvo opciones V2 (C1), con IDs TEXT originales, fechas UTC, `revision` en raíces mutables, importes `_minor`, snapshots de pedidos, índices por consultas y tabla `migration_runs`. Incluir `chat_rate_limits(identity_hash TEXT PRIMARY KEY, window_started_at_ms INTEGER, count INTEGER, updated_at_ms INTEGER)` y `chat_usage_daily(day_key TEXT PRIMARY KEY, count INTEGER, request_limit INTEGER)` para permitir copia íntegra antes de O1; O1 añade enforcement con triggers. Crear `_tx_assertions(attempt_id TEXT PRIMARY KEY, passed INTEGER NOT NULL CONSTRAINT tx_precondition CHECK(passed=1))`. Un solo `DB.batch`: insertar guard con `CASE WHEN todas_las_precondiciones THEN 1 ELSE 0 END`, ejecutar mutaciones/auditoría y borrar el guard. Un cero de filas actualizadas no demuestra éxito. Toda edición de datos de precio/opciones incrementará revisión de su raíz. Documentar down/restauración sin borrar operaciones vigentes y probar aplicación sobre DB vacía.
- [ ] Ejecutar ambos comandos del paso 2. Comprobar explícitamente stock, pedido, movimientos, auditoría y `_tx_assertions` después de fallo/success; ninguna fila parcial. El esquema permite históricos sin FK obligatoria a cliente/producto vigente y evita cascadas que amplíen promociones.
- [ ] Commit: `feat: add exact money and guarded D1 transactions`.

## P3: Auth Firebase y autorización con perfiles D1

**Files:** crear `src/lib/auth/firebase-token.ts`, `src/lib/db/{users,roles}.ts`, `scripts/lib/auth-admin.ts`, `tests/lib/firebase-token.test.ts`, `tests/d1/users-roles.test.ts`; modificar `src/lib/auth/{verify-request,permissions}.ts`, `src/firebase/{index.ts,provider.tsx,emulators.ts}`, `src/lib/auth-client.ts` si consume el contexto, `src/components/auth/AuthProvider.tsx` y tests Auth existentes. Retirar exports/hooks Firestore cliente cuando se compruebe que no tienen consumidores.

**Interfaces:** `verifyFirebaseIdToken(token: string): Promise<TokenClaims>`; mantener `verifyToken`, `verifyRequest`, `requireVerifiedEmail`, `requirePermission`, `resolvePermissions`, `hasPermission` y ownership. Repositorios conservan `getUserProfile`, `syncUser`, `listUsers`, `updateUser`, `updateUserProfile`, `listRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole` con argumentos/retornos actuales; reemplazar únicamente la dependencia de `Transaction` por sentencias D1. `initializeFirebase()` pasa a `{app: FirebaseApp; auth: Auth}`.

- [ ] Escribir `firebase_token_rejects_other_project_and_rotates_kid` con RSA sintética y HTTP simulado: algoritmo/firma/audiencia/emisor/sub/exp/iat/auth_time inválidos rechazan; `kid` nuevo refresca certificados; red fallida no acepta. Afirmación: `await expect(verifyFirebaseIdToken(otherProjectToken)).rejects.toThrow()`. En D1 probar `admin_requires_claim_and_profile`, `inactive_role_loses_permission`, `sync_does_not_reactivate_account`, cambios propios y último administrador; `expect(response.status).toBe(403)` para claim solo/perfil solo y rollback de auditoría.
- [ ] Ejecutar `pnpm exec vitest run tests/lib/firebase-token.test.ts tests/lib/permissions.test.ts tests/api/auth-sync.test.ts` y `pnpm test:d1 -- tests/d1/users-roles.test.ts`; confirmar RED relevante.
- [ ] Implementar verificador Worker-safe con claves públicas oficiales y caché según `Cache-Control`, no clave privada. Aceptar tokens de Auth Emulator solo con ambos flags explícitos, host loopback y proyecto demo permitido; producción falla cerrado ante cualquier modo inseguro. Perfiles/roles y comprobación final de reemplazo administrativo residen en D1, dentro del guard; `syncUser` nunca sobrescribe privilegios, direcciones o `active` por defaults. Aislar SDK Admin de tooling en Node.
- [ ] Ejecutar comandos del paso 2 y adaptar `tests/api/{account-profile,admin-roles}.test.ts`, `tests/components/auth-provider.test.tsx`, `tests/lib/{firebase-config,firebase-emulators,users,user-role-mutations}.test.ts`. Acceso cliente ajeno, sin perfil/inactivo y sin correo verificado rechaza con los estados sanitizados actuales.
- [ ] Commit: `feat: keep Firebase Auth with D1 authorization`.

## P4: Catálogo actual, configuración y lecturas operativas en D1

**Files:** crear `src/lib/db/{products,categories,configuration,notifications,promotions,inventory}.ts`, `src/lib/catalog/r2-binding-store.ts`, `tests/d1/repositories.test.ts`; modificar consumidores en `src/app/api/admin/**`, `/api/configuration`, `/api/notifications`, `src/lib/catalog/{home,storage,r2-client}.ts`, `src/lib/reports/order-report.ts` y `src/app/api/admin/stats/route.ts`.

**Interfaces:** conservar nombres y firmas públicas actuales de los módulos trasladados (incluidos overloads de `getProductById` y `getStoreConfiguration({allowDefaults?})`). `createR2BindingImageStore(bucket: R2Bucket, publicBaseUrl: string): CatalogImageStore` implementa la interfaz existente `put/remove/publicUrl`. Mantener el cliente S3 únicamente para CLI remoto autorizado.

- [ ] Adaptar tests de repositorios a D1 y escribir `configuration_requires_explicit_defaults`, `notification_owner_is_enforced`, `category_retirement_preserves_promotion_scope`, `r2_binding_uses_owned_keys`. Para configuración ausente: `await expect(getStoreConfiguration()).rejects.toThrow(StoreConfigurationUnavailableError)` y `expect(await getStoreConfiguration({allowDefaults:true})).toEqual(DEFAULT_STORE_CONFIGURATION)`. Fijar semántica de reportes actual: stats excluye cancelados, reporte conserva todos; no corregirla incidentalmente.
- [ ] Ejecutar `pnpm test:d1 -- tests/d1/repositories.test.ts` y `pnpm exec vitest run tests/lib/configuration.test.ts tests/lib/order-report.test.ts tests/lib/catalog-storage.test.ts tests/api/notifications-review.test.ts` y comprobar el fallo correspondiente.
- [ ] Portar lecturas/mutaciones con permisos y auditoría inseparable; parámetros SQL enlazados. Mantener errores de configuración explícitos, orden/límites actuales y snapshot de historial. Marcar páginas servidor de catálogo/home como dinámicas para no consultar D1 durante build y retirar el fallback `PRODUCTS` de `catalog/home.ts`; errores de infraestructura no se convierten en una carta ficticia. Resolver R2 mediante binding en solicitudes y almacenar la propiedad de claves, sin hacer claves S3 necesarias en el Worker. Los productos conservan por ahora el contrato actual; C1–C2 introducen opciones nuevas y el cambio de stock se cierra allí. Ningún proceso remoto de seed se ejecuta para completar esta tarea.
- [ ] Ejecutar los comandos del paso 2 y adaptar `products-repository`, `promotions`, `inventory`, `catalog-home`, `catalog-r2-client`, `admin-product-image` y pruebas de API según imports movidos. Fallo de auditoría revierte CRUD/inventario/configuración.
- [ ] Commit: `feat: move operational repositories and images to Cloudflare`.

## P5: Pedidos, estados e idempotencia atómicos

**Files:** crear `src/lib/db/orders.ts`, `tests/d1/orders.test.ts`; modificar `src/lib/validation/orders.ts`, `src/app/api/pedidos/{route.ts,[id]/route.ts}`, consumidores de pedidos y tests `orders-audit`, `order-transaction-invariants`, `customer-order`, `order-validation`, `api/orders`.

**Interfaces:** conservar `createOrder(user: VerifiedUser, input: CreateOrderInput, options?: {idempotencyKey?: string}): Promise<Order>`, `listOrders`, `listOwnOrders`, `getCustomerOrder`, `getAdminOrder`, `updateOrderStatus`. El precio actual se conserva en esta etapa; C3 cambia su contrato sin cambiar las garantías de la transacción.

- [ ] Escribir tests concurrentes reales `last_stock_has_one_winner`, `last_coupon_has_one_winner`, `same_key_consumes_once`, `different_payload_same_key_rejects`, `changed_product_revision_reprices_or_rejects`, `audit_failure_leaves_no_order`, `concurrent_status_updates_preserve_history`. Con stock/cupón inicial1: `expect(successfulOrders).toHaveLength(1)`; con misma clave/payload veinte veces: `expect(new Set(returnedOrders.map(order => order.id)).size).toBe(1)`. Afirmar todas las tablas, no solo respuestas; agrupar cantidad de producto aunque haya distintas personalizaciones.
- [ ] Ejecutar `pnpm test:d1 -- tests/d1/orders.test.ts` y tests unitarios/API enfocados; observar RED sobre la implementación ausente.
- [ ] Leer raíces y revisiones de forma consistente, calcular con registros servidor y comprobar dentro del guard que siguen vigentes producto/categoría/promoción, stock agregado, cupo y estado esperado. Usar el ID estable UID+clave y fingerprint existentes; primero devolver el pedido idéntico encontrado. Ante conflicto, recargar/validar y reintentar hasta tres intentos totales; agotamiento de `TransactionConflictError` responde409 recuperable y validación de dominio conserva422. Nunca reintentar errores genéricos SQL/auditoría. Un único batch crea pedido, detalle, historial, decrementos, promoción, movimientos, notificaciones y auditorías. No usar `INSERT OR IGNORE` seguido de descuentos incondicionales.
- [ ] Ejecutar los comandos del paso 2 y probar permisos de staff/cliente, estados terminales y DTO público sin actor/auditoría. Las cantidades/precios inválidos se rechazan antes del commit; el conflicto agotado ofrece reintento recuperable, no pérdida parcial.
- [ ] Commit: `feat: preserve atomic checkout and order transitions in D1`.

## P6: Migración verificable, CLI y Auth Emulator con D1

**Files:** crear `scripts/{export-firestore,import-d1,verify-d1-migration}.ts`, `scripts/lib/{migration-model,d1-target}.ts`, `tests/scripts/{migration-model,import-d1,verify-d1-migration}.test.ts`; modificar `scripts/{firebase-admin,set-admin,seed-catalog,migrate-orders,verify-migration,e2e-local-state,e2e-local-cleanup,e2e-local-runner,local-emulator-env}.ts`, `scripts/catalog/import-adapter.ts`, `playwright.config.ts`, `firebase.json`, `package.json`, `tests/e2e/local-state.ts`, `tests/e2e/cleanup-safety.ts`, pruebas de arnés actuales y README. Retirar `src/lib/firebase-admin.ts` al aislar sus consumidores Node, el runner `scripts/run-firestore-rules-tests.ts` y tests de reglas sustituidos por autorización API. Retirar ejecución/pruebas del sugeridor antiguo y sustituir `src/app/ai-suggest/page.tsx` por redirect a `/menu?chat=opsy` antes de eliminar `getAdminDb`.

**Interfaces:** `planMigration(snapshot: FirestoreExport): MigrationPlan`, `applyMigration(plan: MigrationPlan, target: D1Target, options: {write: boolean}): Promise<MigrationReport>`, `verifyMigration(plan: MigrationPlan, target: D1Target): Promise<MigrationVerification>`. Tipos en `migration-model.ts`: export canónico versionado con colecciones/IDs/tipos/hashes; `MigrationPlan` con filas, conteos transformados y `conflicts`; `MigrationReport` con `status: 'dry-run'|'applied'|'blocked'`, `writtenRows`, conteos/hashes y ruta privada de rechazos; `MigrationVerification` con `ok` y `differences`. `D1Target` distingue `local` y `remote` y exige identificadores explícitos; por defecto todos los ejecutables son dry-run. Scripts `db:export`, `db:import`, `db:verify` no se llaman al arrancar la app.

- [ ] Crear fixture sintético de las once colecciones más `orders`: histórico huérfano, IDs iguales equivalentes/conflictivos, timestamp inválido, precio `1.005`, promoción duplicada, cuenta inactiva, Unicode/comillas/texto con apariencia SQL y reejecución del mismo manifiesto. Con dos versiones distintas de un mismo ID: `expect(plan.conflicts).toHaveLength(1)` y `expect(report.writtenRows).toBe(0)`. Afirmar conservación exacta de textos/IDs/snapshots y que importación repetida no duplica ni sobrescribe un checksum distinto. Añadir test de cleanup con ruta fuera de `.tmp/e2e/` que debe rechazar.
- [ ] Ejecutar `pnpm exec vitest run tests/scripts/migration-model.test.ts tests/scripts/import-d1.test.ts tests/scripts/verify-d1-migration.test.ts tests/lib/e2e-cleanup.test.ts`; comprobar RED con fixtures solamente.
- [ ] Implementar export privado lossless de ambas fuentes y demás colecciones, reconciliación por ID y reporte de referencias/precisión. Importar dinero sin recalcular históricos. `D1Target` local usa bindings; remoto usa Wrangler oficial autenticado y destino explícito, con serialización SQL probada en ficheros privados y ejecución sin shell, sin imprimir filas ni exigir credenciales nuevas si hay sesión válida. Mover digest/count/window antiguos de IA a `chat_rate_limits`, manteniendo el mismo valor secreto HMAC durante el corte; diarios nuevos parten de cero de forma documentada, y O1 valida/aplica los límites antes de habilitar chat. Adaptar `set-admin` a Auth+D1 con compensación ante fallo parcial. Convertir seed/importador a D1 con destino y bandera de escritura explícitos. Runner E2E selecciona entorno por allowlist, Auth Emulator loopback/proyecto demo y D1/R2 local por runId, sin Firestore Emulator ni fallback remoto. No dejar scripts operativos antiguos escribiendo Firestore: los históricos se convierten en lectura/offline o fallan con indicación de reemplazo. Desconectar el sugeridor Genkit y retirar sus imports/flow/tests para que eliminar `getAdminDb` no deje módulos inválidos; O3 completa widget y limpieza de dependencias/enlaces.
- [ ] Ejecutar tests del paso 2, `pnpm test:d1`, `pnpm test:e2e:local`, `pnpm typecheck`, `pnpm cf:build`; comprobar login→compra→gestión de estado con datos sintéticos. Retirar la inicialización/dependencia Firestore de aplicación y tests de reglas reemplazados por permisos API equivalentes. El sugeridor ya no se ejecuta; su enlace estable abre `/menu` hasta que O3 monte el chat. Documentar rollback de datos, bloqueo del origen y contingencia compatible; no ejecutar el corte.
- [ ] Commit: `feat: add verified D1 migration and isolated local QA`.

## Cierre del bloque

La aplicación se prueba localmente sobre D1 con Auth. El runbook identifica las escrituras remotas pendientes. C1–C5 actualizan el catálogo comercial; O1–O3 sustituyen la entrada IA antigua por Opsy y completan su limpieza. El gate integral R1 verifica el resultado conjunto y Linux/CI, sin dar por migrados datos reales.
