# Catálogo Real Con Edición Administrativa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cargar el catálogo real de Coctels OPS una sola vez, guardar sus imágenes en Firebase Storage, usar Firestore como fuente oficial y permitir mantenimiento completo desde el panel administrativo.

**Architecture:** Se agregará un flujo de importación idempotente y validable que recibe un archivo estructurado y archivos de imagen locales. El catálogo público y el carrusel leerán los mismos documentos activos/destacados de Firestore. El panel conservará el CRUD actual y añadirá subida protegida de imágenes mediante Firebase Admin Storage.

**Tech Stack:** Next.js 16.3.0, React 19, TypeScript, Firebase Admin 13.x, Firestore, Firebase Storage, Zod, Vitest, Playwright.

## Global Constraints

- Canva se utiliza únicamente como referencia de carga inicial; no habrá sincronización automática Canva -> aplicación.
- Firestore será la fuente oficial después de la importación.
- La importación será `upsert`, no ejecutará borrados automáticos y usará IDs estables.
- Las imágenes se guardarán en Firebase Storage; no se usarán URLs temporales de Canva ni fotos aleatorias.
- Las credenciales Admin no entran en Git, logs ni respuestas HTTP.
- Toda escritura remota de productos o Storage requiere confirmación explícita del operador después del dry-run.
- El carrusel no solicitará rutas locales inexistentes como `/Fresa.png`.

---

## File Map

- `src/lib/firebase-admin.ts`: inicialización Admin y acceso al bucket Storage.
- `src/lib/catalog/import-schema.ts`: contrato y validación de registros de importación.
- `src/lib/catalog/storage.ts`: subida de imágenes y construcción de URLs persistibles.
- `scripts/import-catalog.ts`: dry-run e importación idempotente de productos e imágenes.
- `scripts/catalog/products.json`: entrada local de datos comerciales, ignorada hasta que existan los datos reales.
- `src/app/api/admin/productos/[id]/image/route.ts`: endpoint protegido para reemplazar una imagen.
- `src/components/admin/ProductForm.tsx`: selector de archivo y flujo de guardado de imagen.
- `src/components/products/CocktailCarousel.tsx`: carrusel basado en productos destacados de Firestore.
- `src/app/page.tsx`: pasa productos destacados al carrusel sin duplicar catálogo.
- `.env.example`: nombre de la configuración del bucket Storage.
- `package.json`: script `catalog:import` para ejecutar el importador con `tsx`.
- `.gitignore`: excluir las imágenes locales de importación.
- `tests/lib/catalog-import.test.ts`: validación, IDs y dry-run.
- `tests/lib/catalog-storage.test.ts`: restricciones y metadatos de imagen.
- `tests/api/admin-product-image.test.ts`: autorización y contratos HTTP de subida.
- `tests/components/cocktail-carousel.test.tsx`: fallback y render de imágenes de productos.
- `tests/e2e/catalog-admin.spec.ts`: edición administrativa y reflejo público.

### Task 1: Definir El Contrato De Importación

**Files:**
- Create: `src/lib/catalog/import-schema.ts`
- Create: `scripts/catalog/products.example.json`
- Create: `tests/lib/catalog-import.test.ts`
- Modify: `src/types/catalog.ts:12-29`

**Interfaces:**
- `CatalogImportRecord`: `{ id: string; imageFile: string; product: Omit<ProductInput, "image"> & { image?: string } }`.
- `catalogImportRecordSchema`: esquema Zod que valida `id`, `imageFile` y todos los campos comerciales de `ProductInput`, dejando `image` opcional porque la URL se genera después de subir el archivo.
- `parseCatalogImport(input: unknown): CatalogImportRecord[]`: valida el array completo y rechaza IDs o nombres duplicados.
- `getCatalogImportPath(): string`: devuelve la ruta fija `scripts/catalog/products.json` para que dry-run e import usen la misma entrada.

- [ ] **Step 1: Write the failing tests**

```ts
it("rechaza productos con ids duplicados o imageFile vacío", () => {
  expect(() => parseCatalogImport([
    { id: "fresa-salvaje", imageFile: "", product: validProduct },
    { id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct },
  ])).toThrow();
});

it("acepta un registro completo con id estable", () => {
  expect(parseCatalogImport([
    { id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct },
  ])).toEqual([
    { id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct },
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/catalog-import.test.ts`

Expected: FAIL because `parseCatalogImport` does not exist.

- [ ] **Step 3: Implement the minimal contract**

Reuse `productInputSchema` from `src/lib/validation/catalog.ts`, require non-empty lowercase-safe IDs matching `^[a-z0-9-]+$`, require a relative image filename without `..`, and validate the complete array before returning it.

- [ ] **Step 4: Add the source file contract**

Create `scripts/catalog/products.example.json` as an array of records with this exact shape for parser tests. The real `scripts/catalog/products.json` remains absent/ignored until the operator provides final commercial data and image filenames; the example must never be imported:

```json
[
  {
    "id": "producto-real-en-minusculas",
    "imageFile": "producto-real.jpg",
    "product": {
      "name": "Nombre real",
      "description": "Descripción comercial real",
      "price": 10000,
      "image": "",
      "category": "granizado",
      "availableFlavors": [],
      "availableAddOns": [],
      "stock": 0,
      "active": true,
      "featured": false
    }
  }
]
```

The importer will replace `product.image` after Storage upload; the input value may be omitted in the import record and must not be sent to Firestore directly.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/catalog-import.test.ts`

Expected: PASS with duplicate IDs, unsafe filenames and invalid product fields rejected.

- [ ] **Step 6: Commit**

```bash
git add src/lib/catalog/import-schema.ts src/types/catalog.ts scripts/catalog/products.example.json tests/lib/catalog-import.test.ts
git commit -m "feat: definir contrato de importación del catálogo"
```

### Task 2: Añadir Storage Y El Importador Idempotente

**Files:**
- Create: `src/lib/catalog/storage.ts`
- Create: `scripts/import-catalog.ts`
- Create: `tests/lib/catalog-storage.test.ts`
- Modify: `src/lib/firebase-admin.ts:41-58`
- Modify: `src/lib/firestore/products.ts:78-100`
- Modify: `.env.example:1-12`
- Modify: `package.json` scripts
- Modify: `.gitignore` catalog image input rule
- Modify: `README.md` in the production configuration section

**Interfaces:**
- `getAdminStorageBucket(): Bucket`: returns the configured Firebase Storage bucket.
- `uploadProductImageBytes(input: { bytes: Uint8Array; filename: string; contentType: string }, productId: string): Promise<string>`: validates image bytes, uploads them under `catalog/products/<id>/<filename>`, applies content metadata and returns a URL-safe persisted reference.
- `uploadLocalProductImage(imageFile: string, productId: string): Promise<string>`: reads one validated local input and delegates to `uploadProductImageBytes`.
- `upsertImportedProduct(id: string, input: ProductInput, actorUid: string): Promise<"created" | "updated">`: writes one stable document, preserving existing `createdAt`, updating `updatedAt`, and recording the existing audit entry.
- `runCatalogImport(options: { dryRun: boolean }): Promise<ImportReport>`: validates all records, checks every image, and writes only when `dryRun` is false.
- `ImportReport`: `{ products: number; images: number; created: number; updated: number; errors: string[] }`.

- [ ] **Step 1: Write failing Storage tests**

```ts
it("rechaza rutas de imagen fuera del directorio de entrada", async () => {
  await expect(uploadLocalProductImage("..\\secret.json", "fresa-salvaje")).rejects.toThrow();
});

it("genera la ruta de Storage dentro del prefijo de catálogo", async () => {
  storageUpload.mockResolvedValue({ publicUrl: "https://storage.example/catalog/products/fresa-salvaje/fresa.jpg" });
  await expect(uploadProductImageBytes({ bytes: new Uint8Array([1, 2, 3]), filename: "fresa.jpg", contentType: "image/jpeg" }, "fresa-salvaje")).resolves.toContain("catalog/products/fresa-salvaje/");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/catalog-storage.test.ts`

Expected: FAIL because the Storage helper and bucket access do not exist.

- [ ] **Step 3: Add bucket configuration**

Extend `getAdminApp()` with the optional `storageBucket: process.env.FIREBASE_STORAGE_BUCKET` setting without requiring it in emulator mode. Add `FIREBASE_STORAGE_BUCKET` to `.env.example`; its Production value will be the existing Firebase bucket for `studio-6073503308-82036`, configured outside Git. `getAdminStorageBucket()` must require the variable only when an actual Storage operation starts.

- [ ] **Step 4: Implement secure image upload**

Use `getStorage(getAdminApp()).bucket(requireEnv("FIREBASE_STORAGE_BUCKET"))`, reject absolute paths, traversal, unsupported extensions and files larger than 5 MB, accept only JPEG/PNG/WebP, set `contentType`, add a random `firebaseStorageDownloadTokens` metadata value, and return the stable Firebase download URL for the public product image. Do not print file contents or credentials.

- [ ] **Step 5: Write failing importer tests**

```ts
it("dry-run valida todos los registros sin escribir Firestore ni Storage", async () => {
  const report = await runCatalogImport({ dryRun: true });
  expect(report.errors).toEqual([]);
  expect(transactionSet).not.toHaveBeenCalled();
  expect(storageUpload).not.toHaveBeenCalled();
});

it("actualiza por id estable sin borrar documentos ausentes", async () => {
  await runCatalogImport({ dryRun: false });
  expect(transactionSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ updatedAt: expect.any(String) }));
  expect(transactionDelete).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Implement `scripts/import-catalog.ts`**

Load the operator-provided `scripts/catalog/products.json`, call `parseCatalogImport`, resolve each `imageFile` under `scripts/catalog/images`, upload images only after all validation succeeds, then call `upsertImportedProduct` with actor UID `catalog-import`. `--dry-run` must be the default; `--write` is required for remote writes. Add the `catalog:import` package script as `tsx scripts/import-catalog.ts`.

- [ ] **Step 7: Run importer tests**

Run: `npx vitest run tests/lib/catalog-import.test.ts tests/lib/catalog-storage.test.ts`

Expected: PASS, including no-write behavior for dry-run and no delete calls.

- [ ] **Step 8: Commit**

```bash
git add src/lib/catalog/storage.ts scripts/import-catalog.ts src/lib/firebase-admin.ts .env.example README.md package.json .gitignore tests/lib/catalog-storage.test.ts
git commit -m "feat: añadir importación idempotente de catálogo e imágenes"
```

### Task 3: Permitir Reemplazo De Imagen Desde El Panel

**Files:**
- Create: `src/app/api/admin/productos/[id]/image/route.ts`
- Create: `tests/api/admin-product-image.test.ts`
- Modify: `src/components/admin/ProductForm.tsx:16-71`
- Modify: `src/lib/firestore/products.ts:92-100`

**Interfaces:**
- `POST /api/admin/productos/:id/image`: accepts `multipart/form-data` with `image`, requires `productos.write`, uploads the file and updates only `image` plus `updatedAt`.
- Response `200`: `{ product: Product }`.
- Response `401/403`: existing authorization contract.
- Response `413`: file larger than 5 MB.
- Response `422`: unsupported or malformed image.

- [ ] **Step 1: Write failing route tests**

```ts
it("rechaza la subida de imagen sin permiso productos.write", async () => {
  const response = await POST(new Request("http://localhost/api/admin/productos/1/image", {
    method: "POST",
    body: new FormData(),
  }), { params: Promise.resolve({ id: "1" }) });
  expect(response.status).toBe(403);
});

it("sube la imagen y actualiza solo el campo image", async () => {
  const form = new FormData();
  form.append("image", new File([new Uint8Array([1, 2, 3])], "fresa.jpg", { type: "image/jpeg" }));
  const response = await POST(authorizedRequest(form), { params: Promise.resolve({ id: "1" }) });
  expect(response.status).toBe(200);
  expect(updateProductImage).toHaveBeenCalledWith("1", expect.stringContaining("catalog/products/1/"), expect.anything());
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/api/admin-product-image.test.ts`

Expected: FAIL because the route and image update repository method do not exist.

- [ ] **Step 3: Implement protected image update**

Reuse `requirePermission`, `toAuthorizationResponse`, the shared Storage validator and the existing audit transaction. Keep the old image reference until the new upload succeeds; update the product only after Storage returns successfully.

- [ ] **Step 4: Update `ProductForm`**

Add an optional file input with `accept="image/jpeg,image/png,image/webp"`, show the current image, submit product fields first, then upload a selected replacement file for an existing product to the new endpoint. For a new product, keep the URL field required until the product has an ID; this avoids creating orphaned Storage objects when product creation fails. Display the returned validation error and prevent duplicate submits while either request is running. Keep the existing URL field as a migration fallback for records that already contain a valid URL.

- [ ] **Step 5: Run route and component tests**

Run: `npx vitest run tests/api/admin-product-image.test.ts tests/lib/catalog-validation.test.ts`

Expected: PASS for authorization, content validation, upload success and unchanged product fields.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/productos/[id]/image/route.ts src/components/admin/ProductForm.tsx src/lib/firestore/products.ts tests/api/admin-product-image.test.ts
git commit -m "feat: permitir reemplazar imagenes desde admin"
```

### Task 4: Unificar Carrusel Y Catálogo Público

**Files:**
- Create: `tests/components/cocktail-carousel.test.tsx`
- Modify: `src/components/products/CocktailCarousel.tsx:1-128`
- Modify: `src/app/page.tsx:11-145`
- Modify: `src/components/products/ProductCard.tsx:26-39`

**Interfaces:**
- `CocktailCarousel({ products }: { products: Product[] })`: renders active featured products in stable order.
- When `products` is empty, render a non-broken neutral placeholder with the text `Catálogo en preparación`; do not request `/Fresa.png` or random external photos.

- [ ] **Step 1: Write failing component tests**

```tsx
it("usa la imagen del producto destacado y no solicita rutas locales", () => {
  render(<CocktailCarousel products={[featuredProduct]} />);
  expect(screen.getByRole("img", { name: featuredProduct.name })).toHaveAttribute("src", expect.stringContaining(encodeURIComponent(featuredProduct.image)));
  expect(screen.queryByRole("img", { name: "Fresa Salvaje" })).not.toHaveAttribute("src", "/Fresa.png");
});

it("muestra un fallback cuando todavía no hay productos destacados", () => {
  render(<CocktailCarousel products={[]} />);
  expect(screen.getByText("Catálogo en preparación")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/cocktail-carousel.test.tsx`

Expected: FAIL because the current carousel hardcodes missing `/Fresa.png`-style paths and accepts no products prop.

- [ ] **Step 3: Implement the shared source**

Pass `featuredProducts` already loaded by `Home` into `CocktailCarousel`; filter active/featured products, use each `product.image`, and render the controlled fallback when the list is empty. Update `ProductCard` to use the same non-broken fallback policy rather than a random external image when `image` is empty.

- [ ] **Step 4: Run component tests and build**

Run: `npx vitest run tests/components/cocktail-carousel.test.tsx`; `npm run typecheck`; `npm run lint`; `npm run build`

Expected: PASS with no missing public asset requests in the rendered carousel.

- [ ] **Step 5: Commit**

```bash
git add src/components/products/CocktailCarousel.tsx src/app/page.tsx src/components/products/ProductCard.tsx tests/components/cocktail-carousel.test.tsx
git commit -m "fix: unificar imagenes del carrusel con el catalogo"
```

### Task 5: Importar El Catálogo Real Con Aprobación

**Files:**
- Use untracked local image inputs under `scripts/catalog/images/` only after the operator provides them; never commit the binaries.
- Use untracked local `scripts/catalog/products.json` and `scripts/catalog/images/` inputs with the final product data and images.
- Create: `tests/e2e/catalog-admin.spec.ts`

**Interfaces:**
- Operator runs the dry-run first and reviews the report.
- Operator explicitly authorizes `npm run catalog:import -- --write` only after the report is clean.

- [ ] **Step 1: Add the final local images and commercial data**

Use one stable filename per product and complete all fields required by `productInputSchema`: name, description, price, category, flavors, add-ons, stock, active and featured. Add `scripts/catalog/images/` and `scripts/catalog/products.json` to `.gitignore`. Do not add credentials or Canva session data.

- [ ] **Step 2: Run the non-writing validation**

Run: `npm run catalog:import -- --dry-run`

Expected: report all records and image files as valid, with `errors: []`, `created: 0`, `updated: 0`, `images: 0`.

- [ ] **Step 3: Run the E2E regression before remote write**

Run: `npm run test:e2e -- tests/e2e/catalog-admin.spec.ts`

Expected: the authorized admin can open products, edit a price and active flag, and the public catalog reflects the change without exposing inactive products.

- [ ] **Step 4: Obtain explicit operator approval for remote import**

Do not execute the write command from automation or a deployment hook. Wait for the operator to approve the clean dry-run.

- [ ] **Step 5: Execute the idempotent import**

Run: `npm run catalog:import -- --write`

Expected: the report lists the exact number of uploaded images and created/updated products, with no delete operations.

- [ ] **Step 6: Verify public and admin behavior**

Run: `npm test`; `npm run typecheck`; `npm run lint`; `npm run build`; `npm run test:e2e -- tests/e2e/catalog-admin.spec.ts`

Verify manually that `/menu`, home featured products, checkout, admin product editing and image replacement work with the imported data.

- [ ] **Step 7: Commit only the catalog data manifest and code**

```bash
git add src tests package.json package-lock.json
git commit -m "feat: cargar catálogo real de Coctels OPS"
```

Do not commit the Firebase service account JSON, `.env` files, local session state or unapproved image artifacts.

## Final Verification

Before marking the work complete, run the full suite sequentially to avoid the previously observed Vitest worker saturation:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:firestore-rules
npm run test:e2e -- tests/e2e/catalog-admin.spec.ts
```

Then verify the production smoke endpoints and capture the deployment URL. A deployment is allowed only after the security review, tests, E2E evidence and explicit operator authorization required by the project checklist.
