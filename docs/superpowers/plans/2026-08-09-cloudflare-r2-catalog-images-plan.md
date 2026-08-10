# Cloudflare R2 Catalog Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar Firebase Storage por Cloudflare R2 para las imágenes del catálogo, manteniendo Firestore, Firebase Auth, Vercel, checkout e interfaz administrativa.

**Architecture:** El servidor y el importador usarán `@aws-sdk/client-s3` contra el endpoint S3 de R2. La capa de catálogo conservará sus funciones públicas actuales, y un adaptador común devolverá URLs basadas en `R2_PUBLIC_BASE_URL`. Firestore seguirá guardando el campo `image` y la importación conservará su `upsert` y auditoría.

**Tech Stack:** Next.js 16.3.0, TypeScript, Firebase Admin 13.x para Firestore/Auth, Cloudflare R2 S3 API, `@aws-sdk/client-s3`, Zod, Vitest, Playwright.

## Global Constraints

- R2 se usará únicamente para imágenes; Firestore seguirá siendo la fuente oficial de productos.
- Las imágenes usarán el prefijo estable `catalog/products/{productId}/` y una clave versionada por subida.
- El código de R2 se ejecutará exclusivamente en servidor o CLI; nunca en componentes cliente.
- `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` no aparecerán en Git, logs, respuestas HTTP ni variables `NEXT_PUBLIC_*`.
- Firebase Admin, Firebase Auth/login, Firestore y toda la autenticación/autorización existente permanecerán intactos. Seguirá usando `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` para Firestore; no se eliminarán esas credenciales.
- `dry-run` no podrá llamar a R2 ni escribir Firestore; `--write` será necesario para cualquier escritura remota.
- El SDK tendrá como máximo tres intentos y no habrá bucles propios infinitos.
- El bucket usará la clase Standard; `r2.dev` será solo para pruebas y producción requerirá dominio personalizado.
- No se harán borrados automáticos de productos ni de imágenes anteriores.
- No se ejecutará una escritura remota hasta que el operador confirme un `dry-run` limpio.

---

## File Map

- Create: `src/lib/catalog/r2-store-core.ts`: cliente S3 perezoso y adaptador neutral para servidor/CLI.
- Create: `src/lib/catalog/r2-client.ts`: envoltura `server-only` del adaptador R2 para Next.js.
- Modify: `src/lib/catalog/storage-core.ts`: contrato independiente del proveedor, claves, subida y borrado compensatorio.
- Modify: `src/lib/catalog/storage.ts`: fachada server-only sobre R2.
- Modify: `scripts/catalog/import-adapter.ts`: adaptador CLI para R2 y limpieza.
- Modify: `src/lib/catalog/import-core.ts`: limpieza de objetos si falla el upsert.
- Modify: `src/lib/catalog/importer.ts`: registrar el adaptador de limpieza en el flujo server-side.
- Modify: `src/app/api/admin/productos/[id]/image/route.ts`: limpiar el nuevo objeto si falla la actualización del producto.
- Modify: `src/lib/firebase-admin.ts`: retirar únicamente el acceso Admin a Firebase Storage.
- Modify: `scripts/firebase-admin.ts`: retirar únicamente el acceso CLI a Firebase Storage.
- Modify: `.env.example`: documentar variables R2 y conservar las variables Admin de Firestore.
- Modify: `README.md`: documentar creación del bucket, token restringido, dominio y configuración.
- Modify: `package.json`, `package-lock.json`: añadir `@aws-sdk/client-s3`.
- Modify: `tests/lib/catalog-storage.test.ts`: probar la capa R2 con un store falso.
- Modify: `tests/lib/catalog-import.test.ts`: probar dry-run y limpieza de importación.
- Modify: `tests/api/admin-product-image.test.ts`: probar subida, autorización y limpieza del endpoint.
- Create: `tests/lib/catalog-r2-client.test.ts`: probar comandos S3, configuración y URLs sin credenciales reales.

---

### Task 1: Crear Cliente R2 Y Configuración Segura

**Files:**
- Create: `src/lib/catalog/r2-client.ts`
- Create: `tests/lib/catalog-r2-client.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- `getR2CatalogImageStore(): CatalogImageStore`: crea de forma perezosa un `S3Client` con `endpoint`, `region: "auto"`, credenciales privadas y `maxAttempts: 3`.
- `CatalogImageStore.put(input: { key: string; bytes: Uint8Array; contentType: string }): Promise<void>`: ejecuta `PutObjectCommand` con `Bucket`, `Key`, `Body`, `ContentType` y `CacheControl: "public, max-age=3600"`.
- `CatalogImageStore.remove(key: string): Promise<void>`: ejecuta `DeleteObjectCommand` contra el mismo bucket.
- `CatalogImageStore.publicUrl(key: string): string`: concatena `R2_PUBLIC_BASE_URL` y codifica cada segmento de la clave sin convertir `/` en `%2F`.

- [ ] **Step 1: Añadir la dependencia S3**

Ejecutar `npm install @aws-sdk/client-s3` desde la raíz del proyecto. La dependencia debe quedar en `dependencies`, no en `devDependencies`.

- [ ] **Step 2: Escribir pruebas de configuración y comandos**

Mockear `@aws-sdk/client-s3` y verificar que:

```ts
await store.put({ key: "catalog/products/fresa/fresa.jpg", bytes, contentType: "image/jpeg" });
expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({
  Bucket: "catalog-images",
  Key: "catalog/products/fresa/fresa.jpg",
  ContentType: "image/jpeg",
  CacheControl: "public, max-age=3600",
}));
```

Agregar casos que rechacen variables ausentes sin imprimir su contenido, que verifiquen `DeleteObjectCommand` y que esperen la URL `https://img.example.com/catalog/products/fresa/fresa.jpg` para la clave anterior.

- [ ] **Step 3: Ejecutar la prueba en rojo**

Ejecutar `npx vitest run tests/lib/catalog-r2-client.test.ts`.

Esperado: FAIL porque todavía no existe el cliente R2.

- [ ] **Step 4: Implementar el cliente mínimo**

Leer las variables solo al crear el store, exigir `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_PUBLIC_BASE_URL`, y construir el endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`. No importar este módulo desde componentes cliente.

- [ ] **Step 5: Documentar variables y operación**

Agregar al `.env.example` las cinco variables R2. Mantener `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` porque el importador todavía escribe Firestore. En `README.md`, documentar que el token debe limitarse al bucket del catálogo, que `r2.dev` es solo de prueba y que las credenciales no deben pegarse en el chat ni guardarse en Git.

- [ ] **Step 6: Ejecutar la prueba en verde**

Ejecutar `npx vitest run tests/lib/catalog-r2-client.test.ts` y verificar que pasa sin credenciales reales.

- [ ] **Step 7: Commit opcional de la unidad**

Si el operador solicita commits durante la ejecución, usar:

```bash
git add src/lib/catalog/r2-client.ts tests/lib/catalog-r2-client.test.ts package.json package-lock.json .env.example README.md
git commit -m "feat: añadir cliente de imagenes para Cloudflare R2"
```

### Task 2: Sustituir Storage-Core Y Mantener Validaciones

**Files:**
- Create: `src/lib/catalog/r2-store-core.ts`
- Modify: `src/lib/catalog/r2-client.ts`
- Modify: `src/lib/catalog/storage-core.ts`
- Modify: `src/lib/catalog/storage.ts`
- Modify: `tests/lib/catalog-storage.test.ts`
- Modify: `src/lib/firebase-admin.ts`
- Modify: `scripts/firebase-admin.ts`
- Modify: `scripts/catalog/import-adapter.ts`
- Modify: `.env.example`

**Interfaces:**
- `CatalogImageStore`: el tipo compartido por `r2-store-core.ts` y `storage-core.ts`.
- `catalogImageKey(productId: string, filename: string): string`: devuelve una clave como `catalog/products/{productId}/{uuid}-{filename}` después de validar el ID y el nombre seguro.
- `uploadCatalogImageBytes(input, productId, store): Promise<{ key: string; url: string }>`: valida bytes y sube la imagen mediante `store.put`.
- `deleteCatalogImage(key: string, store): Promise<void>`: elimina exactamente la clave versionada que recibió la operación.
- `uploadProductImageBytes(input, productId): Promise<{ key: string; url: string }>` y `deleteProductImage(key: string): Promise<void>`: fachadas server-only usando `getR2CatalogImageStore`.

- [ ] **Step 1: Cambiar las pruebas a un store falso**

Reemplazar el mock de `@/lib/firebase-admin` por un store con `put`, `remove` y `publicUrl`. Conservar los casos existentes de MIME, bytes inválidos, tamaño, rutas absolutas, traversal y symlinks. Añadir:

```ts
it("sube y devuelve la clave versionada y URL de R2", async () => {
  const upload = await uploadProductImageBytes(validJpeg, "fresa-salvaje");
  expect(put).toHaveBeenCalledWith(expect.objectContaining({
    key: expect.stringMatching(/^catalog\/products\/fresa-salvaje\/[0-9a-f-]+-fresa\.jpg$/),
    contentType: "image/jpeg",
  }));
  expect(upload.url).toContain("https://img.example.com/catalog/products/fresa-salvaje/");
});
```

- [ ] **Step 2: Ejecutar pruebas en rojo**

Ejecutar `npx vitest run tests/lib/catalog-storage.test.ts`.

Esperado: FAIL porque las fachadas todavía dependen de Firebase Storage.

- [ ] **Step 3: Implementar la clave y el adaptador agnóstico**

Conservar `assertCatalogProductId`, `validateProductImageBytes` y `assertSafeImageFilename`. Generar un UUID por subida antes de construir la clave, conservar el nombre validado y no normalizarlo con operaciones que permitan salir del prefijo del producto. El store R2 se inyectará en `storage-core.ts`, de modo que los tests no necesitan red ni credenciales. La fachada `r2-client.ts` conservará `import "server-only"`; el CLI importará la primitiva neutral `r2-store-core.ts` para no duplicar configuración ni cliente.

- [ ] **Step 4: Retirar solo Firebase Storage Admin**

Retirar únicamente el adaptador no utilizado de Firebase Storage: los imports de `firebase-admin/storage`, `@google-cloud/storage`, las funciones `getAdminStorageBucket`/`getSeedAdminStorageBucket` y `FIREBASE_STORAGE_BUCKET` del `.env.example`. En `scripts/catalog/import-adapter.ts`, usar `createR2CatalogImageStore` desde `r2-store-core.ts` y no construir otro `S3Client`. Mantener el paquete `firebase-admin`, `getAdminDb`, `getAdminAuth`, la inicialización de credenciales, el login Firebase, la autorización existente y la configuración del emulador de Firestore sin cambios.

- [ ] **Step 5: Ejecutar pruebas en verde**

Ejecutar `npx vitest run tests/lib/catalog-storage.test.ts tests/lib/catalog-r2-client.test.ts` y verificar que pasan todas las validaciones y la URL R2.

- [ ] **Step 6: Commit opcional de la unidad**

```bash
git add src/lib/catalog/storage-core.ts src/lib/catalog/storage.ts tests/lib/catalog-storage.test.ts src/lib/firebase-admin.ts scripts/firebase-admin.ts .env.example
git commit -m "refactor: usar R2 para imagenes del catalogo"
```

### Task 3: Integrar Importador Y Endpoint Admin Con Limpieza Compensatoria

**Files:**
- Modify: `scripts/catalog/import-adapter.ts`
- Modify: `scripts/import-catalog.ts`
- Modify: `src/lib/catalog/import-core.ts`
- Modify: `src/lib/catalog/importer.ts`
- Modify: `src/app/api/admin/productos/[id]/image/route.ts`
- Modify: `tests/lib/catalog-import.test.ts`
- Modify: `tests/api/admin-product-image.test.ts`

**Interfaces:**
- `CatalogImportAdapters.uploadLocalProductImage`: devuelve `{ key: string; url: string }`.
- `CatalogImportAdapters.deleteLocalProductImage?: (key: string) => Promise<void>`: borra únicamente el objeto recién subido cuando el upsert falla.
- `deleteProductImage(key: string): Promise<void>`: fachada server-only para el endpoint y el importador server-side.
- El endpoint `POST /api/admin/productos/:id/image` conserva sus respuestas `401/403/413/422/200`.

- [ ] **Step 1: Añadir pruebas de rollback**

En `tests/lib/catalog-import.test.ts`, agrega un caso donde `uploadLocalProductImage` resuelve `{ key, url }`, `upsertImportedProduct` rechaza y `deleteLocalProductImage` recibe exactamente `key`. Verifica que el error original queda en el reporte y que no se intenta borrar cuando falla la subida.

En `tests/api/admin-product-image.test.ts`, agrega un caso donde `updateProductImage` rechaza después de una subida correcta y verifica que se llama a `deleteProductImage` con la clave versionada devuelta por la subida y que un fallo de limpieza se registra sin reemplazar el error original.

- [ ] **Step 2: Ejecutar pruebas en rojo**

Ejecutar:

```bash
npx vitest run tests/lib/catalog-import.test.ts tests/api/admin-product-image.test.ts
```

Esperado: FAIL porque el adaptador de borrado y la limpieza compensatoria todavía no existen.

- [ ] **Step 3: Añadir el adaptador CLI de R2**

En `scripts/catalog/import-adapter.ts`, reutilizar `uploadProductImageBytes`, `deleteProductImage` y `upsertImportedProduct`. En `scripts/import-catalog.ts` y `src/lib/catalog/importer.ts`, registrar `deleteLocalProductImage` junto a los adaptadores existentes.

- [ ] **Step 4: Implementar limpieza en `import-core.ts`**

Guardar un indicador local de que la subida terminó. Si el upsert falla después de subir, llamar una sola vez a `deleteLocalProductImage`. Mantener el error original en `errors`; si la limpieza falla, agregar al mismo mensaje que la limpieza no pudo completarse y el ID del producto, sin incluir URLs firmadas, tokens ni secretos.

- [ ] **Step 5: Implementar limpieza del endpoint admin**

Mantener la autorización y las validaciones actuales. Si `updateProductImage` falla después de `uploadProductImageBytes`, ejecutar `deleteProductImage` en un bloque protegido y devolver el error HTTP existente. El producto anterior no se modificará hasta que la subida nueva termine correctamente.

- [ ] **Step 6: Ejecutar pruebas en verde**

Ejecutar:

```bash
npx vitest run tests/lib/catalog-import.test.ts tests/api/admin-product-image.test.ts tests/lib/catalog-storage.test.ts
```

Esperado: PASS en dry-run, subida, autorización, errores y limpieza compensatoria.

- [ ] **Step 7: Commit opcional de la unidad**

```bash
git add scripts/catalog/import-adapter.ts scripts/import-catalog.ts src/lib/catalog/import-core.ts src/lib/catalog/importer.ts src/app/api/admin/productos/[id]/image/route.ts tests/lib/catalog-import.test.ts tests/api/admin-product-image.test.ts
git commit -m "feat: limpiar imagenes R2 cuando falla Firestore"
```

### Task 4: Configurar El Bucket Y Verificar El Flujo Completo

**Files:**
- Modify: `.env.example` y `README.md` si la documentación de Task 1 necesita completar el procedimiento.
- Use only: `scripts/catalog/products.json` y `scripts/catalog/images/` como entradas locales ignoradas.

**Prerequisite:** El operador debe completar la configuración externa sin pegar secretos en el chat.

- [ ] **Step 1: Crear el bucket R2**

En Cloudflare Dashboard, abrir `Storage & databases > R2`, crear un bucket Standard para el catálogo y generar un token API con permisos limitados de Object Read & Write sobre ese bucket.

- [ ] **Step 2: Configurar URL pública**

Para pruebas, habilitar la URL pública `r2.dev` y usarla como `R2_PUBLIC_BASE_URL`. Antes de producción, conectar un dominio personalizado al bucket y reemplazar solo esa variable. No crear un CNAME manual hacia `r2.dev`.

- [ ] **Step 3: Configurar variables sin imprimir valores**

Configurar las cinco variables R2 y las tres credenciales existentes de Firebase Admin en el entorno local y Vercel Production. Verificar únicamente presencia con un comando que muestre `SET`/`UNSET`, nunca el valor.

- [ ] **Step 4: Ejecutar dry-run**

Ejecutar `npm run catalog:import -- --dry-run`.

Esperado: `products: 5`, `errors: []`, `created: 0`, `updated: 0`, `images: 0`; no debe requerir las variables R2 porque no escribe.

- [ ] **Step 5: Obtener autorización de escritura**

Mostrar el reporte limpio al operador y esperar confirmación explícita para la escritura remota. No ejecutar `--write` desde un hook de despliegue.

- [ ] **Step 6: Ejecutar importación remota**

Ejecutar `npm run catalog:import -- --write`.

Esperado: cinco imágenes subidas a R2, cinco documentos creados o actualizados en Firestore, auditorías registradas y `errors: []`.

- [ ] **Step 7: Ejecutar verificación de código**

Ejecutar secuencialmente para evitar saturación de workers:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:firestore-rules
```

- [ ] **Step 8: Ejecutar smoke funcional**

 El smoke específico de catálogo/admin queda pendiente de una prueba E2E específica aún por crear o de la verificación manual existente para catálogo público, productos destacados, checkout, edición admin y reemplazo de imagen. No afirmar que pasó una prueba inexistente. Confirmar que las URLs almacenadas empiezan con `R2_PUBLIC_BASE_URL` y que ninguna apunta a Firebase Storage.

- [ ] **Step 9: Commit opcional final**

Si el operador solicita commits, incluir únicamente código, tests, documentación, `package.json` y `package-lock.json`:

```bash
git add src scripts tests package.json package-lock.json .env.example README.md docs/superpowers/specs/2026-08-09-cloudflare-r2-catalog-images-design.md docs/superpowers/plans/2026-08-09-cloudflare-r2-catalog-images-plan.md
git commit -m "feat: migrar imagenes del catalogo a Cloudflare R2"
```

No incluir `.env`, tokens, service accounts, sesiones ni binarios locales.

## Final Verification

Antes de declarar la migración terminada, revisar el diff y ejecutar de nuevo la verificación secuencial de Task 4. La migración no se considerará aprobada si falla una prueba, si falta evidencia del `dry-run`, si hay URLs de Firebase Storage o si quedan secretos en archivos versionados.
