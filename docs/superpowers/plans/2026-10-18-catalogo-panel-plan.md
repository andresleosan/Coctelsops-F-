# Catálogo, panel y landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gestionar la carta completa desde el panel y venderla con categorías dinámicas, fotografías y precios explícitos por presentación.

**Architecture:** Un agregado de producto con opciones identificadas de forma estable, persistido en tablas D1 y validado tanto en administración como checkout. El carrito solo propone selecciones; el servidor decide importes y disponibilidad. Reutilizar componentes y rutas existentes.

**Tech Stack:** TypeScript/Zod, React/Radix, D1/R2, Vitest/Testing Library y Playwright con Auth Emulator.

**Spec:** [Diseño aprobado](../specs/2026-10-18-cloudflare-catalogo-opsy-design.md), [coordinador](2026-10-18-cloudflare-catalogo-opsy-plan.md), interfaces de [P1–P6](2026-10-18-cloudflare-datos-plan.md).

## Global Constraints

Hereda las restricciones del coordinador. «Borradores con precio desconocido admiten precio ausente/null; permanecen inactivos, no destacados y no comprables.» «La edición de texto/precio no sobrescribe stock que cambió desde checkout.» «Los carritos guardados con formato antiguo deben invalidarse o actualizarse con aviso de revisión antes de pagar.» Sin precios, ingredientes ni fotografías atribuidos por suposición.

## Review Focus

Los tests C1 fijan precios y cardinalidad; C2 comprueba fotografía con ID histórico y stock concurrente; C3 comprueba carrito anterior y snapshot histórico; C4 protege stock/identidad durante importación; C5 verifica contraste, foco y filtros móviles. No activar duplicación de productos ni paginación prematura.

## C1: Opciones y precio exacto como contrato de dominio

**Files:** ampliar `src/types/catalog.ts`, `src/types/orders.ts`; crear `src/lib/catalog/pricing.ts`, `tests/lib/catalog-pricing.test.ts`; modificar `src/lib/validation/catalog.ts`, `tests/lib/catalog-validation.test.ts`; crear `migrations/0002_catalog_options.sql` y su reversión documentada en `migrations/README.md`.

**Interfaces:** añadir los siguientes tipos V2 junto a los antiguos hasta C3/C5; `Product` será alias del nuevo `CatalogProduct` al retirar el puente en C5.

```ts
type ProductSize = {id: string; label: string; volumeOz: number | null; priceCop: number | null};
type ProductFlavor = {id: string; name: string};
type ProductBase = {id: string; name: string; containsAlcohol: boolean};
type CatalogAddOn = {id: string; name: string; priceCop: number; maxQuantity: number};
type CatalogProductData = {
  name: string; description: string; image: string; category: string;
  alcohol: 'with' | 'without' | 'by-base' | 'unknown';
  sizes: ProductSize[]; flavors: ProductFlavor[]; bases: ProductBase[]; addOns: CatalogAddOn[];
  active: boolean; featured: boolean;
};
type CatalogProduct = CatalogProductData & {id: string; stock: number; revision: number};
type CatalogProductCreateInput = CatalogProductData & {initialStock: number};
type ProductSelectionInput = {
  sizeId: string; flavorId: string | null; baseId: string | null;
  addOns: Array<{addOnId: string; quantity: number}>;
};
```

Exportar `catalogProductSchema`, `catalogProductCreateSchema` y `productSelectionSchema`. `getPurchasableSizes(product: CatalogProduct): ProductSize[]`, `getStartingPriceCop(product: CatalogProduct): number | null` y `priceSelection(product: CatalogProduct, selection: ProductSelectionInput): PricedSelection`, donde `PricedSelection` contiene `unitPriceMinor: number` y `snapshot: CurrentOrderCustomization` (definido en C3). El tipo del snapshot se introduce en C1; su consumo ocurre en C3.

- [ ] Escribir `explicit_sizes_match_canva`: `expect(priceSelection(granizado, selection8).unitPriceMinor).toBe(1000000)`, con 16 oz `1500000`, 24 oz `2500000`; cremoso `1200000/1700000/2700000`. Añadir `draft_null_price_is_not_purchasable`, `option_ids_are_unique`, `exactly_one_flavor_and_base`, `unknown_alcohol_cannot_publish` y rechazo de extras duplicados/excedidos.
- [ ] Ejecutar `pnpm exec vitest run tests/lib/catalog-pricing.test.ts tests/lib/catalog-validation.test.ts`; verificar RED con fixtures de precios del diseño.
- [ ] Implementar conversiones mediante P2, tamaños con precio positivo comprable y null solo administrativo; exigir un tamaño, un sabor/base cuando exista el grupo y null cuando no. Cantidad de adición 1 por defecto y máximo entero configurado. IDs de opciones opacos, estables y únicos dentro del producto; no regenerarlos al renombrar. Publicar exige clasificación resuelta y categoría activa validada en repositorio. Añadir tablas/opciones en 0002; no usar multiplicadores en funciones nuevas. El contrato antiguo solo sirve de puente hasta activar todos sus consumidores, no se extiende con reglas nuevas.
- [ ] Ejecutar el comando del paso 2 y `pnpm test:d1 -- tests/d1/schema.test.ts`; probar migración 0001→0002 con preservación de IDs/stock. Ninguna presentación sin precio se ofrece al comprador. El rollback no destruye opciones de pedidos ya recibidos: documentar la recuperación compatible del coordinador.
- [ ] Commit: `feat: define catalog options and exact presentation prices`.

## C2: Persistencia V2 y fotografías seguras

**Files:** modificar `src/lib/db/{products,categories}.ts`, `src/lib/catalog/{storage-core,image-validation}.ts`, `src/app/api/admin/productos/[id]/image/route.ts`; crear `tests/d1/catalog-options.test.ts`, `tests/api/catalog-product-v2.test.ts`; adaptar `tests/api/admin-product-image.test.ts`, `tests/lib/catalog-storage.test.ts`.

**Interfaces:** `listActiveProducts(): Promise<CatalogProduct[]>`, `listAllProducts(caller: CatalogCaller): Promise<CatalogProduct[]>`, `getProductById(id: string, options?: {includeInactive: true; caller: CatalogCaller}): Promise<CatalogProduct | null>`, `createProduct(input: CatalogProductCreateInput, caller: CatalogCaller, id?: string): Promise<string>`, `updateProduct(id: string, input: CatalogProductData, caller: CatalogCaller): Promise<void>`, `updateProductImage(id: string, image: {url: string; key: string | null}, caller: CatalogCaller): Promise<void>`. Conservar los nombres de categorías existentes. Hasta C3/C5, si hace falta compilar consumidores antiguos, mover su adaptador D1 al puente temporal `src/lib/db/legacy-products.ts` y mantener sus imports explícitos; C5 lo elimina por completo.

- [ ] Escribir `catalog_edit_does_not_restore_sold_stock`: tras compra que reduce 10→9, guardar formulario antiguo mantiene 9; `expect((await getProductById('AbC123', adminOptions))?.stock).toBe(9)`. Añadir nueva categoría asignable/filtrable, categoría inactiva no publicada, categoría referenciada devuelve409 y foto con ID `AbC123` válida; fallo SQL tras subida elimina solo objeto nuevo propio, nunca uno referenciado.
- [ ] Ejecutar `pnpm test:d1 -- tests/d1/catalog-options.test.ts` y `pnpm exec vitest run tests/api/catalog-product-v2.test.ts tests/api/admin-product-image.test.ts tests/lib/catalog-storage.test.ts`; verificar RED.
- [ ] Implementar hidratación/guardado de opciones con IDs estables, `revision` de producto para toda edición de opciones/precio/foto, validación de categoría en el guard y stock inicial únicamente en alta. `PATCH` V2 rechaza campo stock; inventario conserva su endpoint con motivo. Crear claves R2 independientes del formato del ID de producto y registrar URL/clave; no borrar imágenes al retirar producto sin comprobar referencias. La subida valida JPEG/PNG/WebP reales y límite 5 MB. Para el alta con imagen, crear borrador con placeholder permitido y mantener ID para reintento antes de publicar. Activar formato V2 de la API administrativa junto al formulario en C5; en esta tarea probar servicios directamente.
- [ ] Ejecutar los comandos del paso 2; revisar que auditoría falle junto a la mutación y que el mantenimiento del alcance de promociones no se convierta en cascada permisiva. Probar nuevo objeto, compensación fallida informada y foto anterior conservada.
- [ ] Commit: `feat: persist full catalog options and safe image ownership`.

## C3: Personalizador, carrito y pedido con selección por IDs

**Files:** modificar `src/types/orders.ts`, `src/lib/validation/orders.ts`, `src/lib/db/orders.ts`, `src/components/products/{ProductCustomizer,ProductCard,ProductCatalogBrowser,CocktailCarousel}.tsx`, `src/context/cart-context.tsx`, `src/app/{menu/page,cart/page,checkout/page}.tsx`, `src/app/cuenta/pedidos/[id]/page.tsx`, `src/lib/catalog/home.ts`; crear `src/lib/orders/customization-summary.ts`, `tests/components/{product-customizer,cart-context}.test.tsx`; adaptar tests de checkout, órdenes, customer-order y D1 orders.

**Interfaces:** `CheckoutItemInput.customization: ProductSelectionInput`; `calculateOrder(input: CreateOrderInput, products: CatalogProduct[]): CalculatedOrder` conserva nombre y devuelve snapshots/importes COP a la API calculados en centavos. Snapshots históricos aceptan la forma antigua intacta y la nueva:

```ts
type CurrentOrderCustomization = {
  version: 2;
  size: {id: string; label: string; volumeOz: number | null};
  flavor: {id: string; name: string} | null;
  base: {id: string; name: string} | null;
  addOns: Array<{id: string; name: string; quantity: number; unitPriceCop: number}>;
};
type HistoricalOrderCustomization = LegacyOrderCustomization | CurrentOrderCustomization;
// LegacyOrderCustomization conserva size Small|Medium|Large, flavors:string[], addOns:string[].
```

`formatCustomization(value: HistoricalOrderCustomization): string`. Carrito persistido con envelope `{version: 2, items: CartItemV2[]}` validado; `getCheckoutItems()` solo transmite IDs/cantidades. Mantener `granizado_go_cart` como clave y detectar el array antiguo. Deep links `/menu?product=<id>` abren el personalizador solo para producto activo encontrado.

- [ ] Escribir `checkout_uses_server_price_not_client`, `legacy_cart_requires_review_notice`, `legacy_order_keeps_original_total_and_labels` y `removed_option_rejects_without_stock_mutation`. Probar exactamente un sabor/base y selección de producto único sin tamaños ficticios. Con producto 8 oz y extra $1.000: `expect(order.items[0].unitPrice).toBe(11000)`, sin `price*0.8`.
- [ ] Ejecutar `pnpm exec vitest run tests/lib/order-validation.test.ts tests/components/product-customizer.test.tsx tests/components/cart-context.test.tsx tests/components/checkout.test.tsx tests/lib/customer-order.test.ts` y `pnpm test:d1 -- tests/d1/orders.test.ts`; observar RED de las nuevas afirmaciones.
- [ ] Cambiar cálculo servidor y componentes a `priceSelection`; eliminar `sizeMultipliers`. Guardar snapshot completo servidor dentro del batch P5 y comprobar revisión de opciones. Mostrar precios explícitos/COP y radios de tamaño/sabor/base, con extras limitados. Invalidar carritos anteriores o corruptos con aviso visible para volver a elegir; si localStorage falla, seguir en memoria sin romper compra. Soportar personalizaciones antiguas en cuenta/WhatsApp/historial sin recálculo. Actualizar `src/lib/orders/whatsapp-message.ts` y sus tests si consumen la personalización. Ignorar IDs de deep link desconocidos con estado útil, sin abrir datos inactivos.
- [ ] Ejecutar ambos comandos del paso 2, `pnpm typecheck` y `pnpm test:e2e:local`; arreglar todos los consumidores/fixtures afectados dentro del cambio de contrato. Repetir test de edición de precio entre lectura y guard: recalcular con revisión actual o devolver conflicto sin cargo parcial.
- [ ] Commit: `feat: checkout catalog selections at explicit verified prices`.

## C4: Carta Canva e importación con diff

**Files:** crear `scripts/catalog/canva-2025.json` con transcripción pública y procedencia por página; modificar `src/lib/catalog/{import-schema,import-core,importer}.ts`, `scripts/import-catalog.ts`, `scripts/catalog/{import-adapter.ts,products.example.json}`, tests `catalog-import`, `catalog-cli` y de migración; adaptar `scripts/lib/migration-model.ts` para normalización del catálogo anterior.

**Interfaces:** `parseCatalogImport(input: unknown): CatalogImportRecord[]`; registro V2 con `id`, `sourcePage: number`, `review: 'verified'|'pending'`, `imageFile?: string`, `product: CatalogProductData`, `initialStock?: number` solo para alta. `planCatalogImport(records: CatalogImportRecord[], existing: CatalogProduct[]): CatalogImportDiff`, con `creates: CatalogImportRecord[]`, `updates: Array<{id:string; product:CatalogProductData}>`, `deactivations: Array<{id:string}>`, `conflicts: string[]`. `runCatalogImportCore` consume ese plan, dry-run por defecto, mismo informe público ampliado con diff. El manifiesto ignorado anterior se conserva y no se sobrescribe.

- [ ] Añadir `canva_manifest_matches_verified_prices` para cada fila de la tabla del diseño y familias, `missing_price_imports_as_draft`, `missing_photo_uses_placeholder`, `dry_run_never_writes`, `existing_ids_and_stock_are_preserved`, `same_name_does_not_reassign_identity`. Para actualización: `expect(diff.updates[0].product).not.toHaveProperty('stock')`. Cubrir precio/descripción/ID de opciones y registro incompleto; no afirmar número total de productos antes de decidir cómo agrupar sabores publicados.
- [ ] Ejecutar `pnpm exec vitest run tests/lib/catalog-import.test.ts tests/lib/catalog-cli.test.ts tests/scripts/migration-model.test.ts`; comprobar RED.
- [ ] Transcribir familias/sabores/tamaños/extras publicados; separar productos con/sin licor y los grupos cuya composición esté comprobada. Licores sin precio, mango con trozos sin clasificación y chantillí sin presentación conocida quedan pendientes/inactivos. No hacer de cuatro toppings incluidos cuatro elecciones arbitrarias. Sin fotografías comprobadas usar placeholder. Diff por ID estable, sin matching por nombre; no modificar stock de existentes, ni ejecutar desactivaciones implícitas. Alta con stock desconocido comienza en0 y solicita ajuste operativo antes de vender; no inventar100 unidades desde fixtures. Para productos legados, materializar sus precios anteriores en presentaciones explícitas durante transformación versionada únicamente; nunca inferir precios Canva de esos valores ni recalcular pedidos históricos.
- [ ] Ejecutar los tests del paso 2 y dry-run contra D1 local sintético mediante `pnpm catalog:import --manifest scripts/catalog/canva-2025.json --target local`; confirmar cero escrituras/objetos creados. Aplicación con escritura se prueba solo en fixture local aislado y verifica mismo diff/checksum al repetir. Cualquier remoto conserva confirmación y destino explícitos.
- [ ] Commit: `feat: add traceable Canva catalog and reconciled imports`.

## C5: Panel completo, landing y retirada del puente

**Files:** modificar `src/components/admin/{ProductForm,CategoryForm}.tsx`, `src/app/admin/{layout.tsx,productos/page.tsx,productos/nueva/page.tsx,productos/[id]/page.tsx,categorias/page.tsx,categorias/nueva/page.tsx,categorias/[id]/page.tsx}`, rutas producto/categoría existentes, `src/app/page.tsx`, `src/app/globals.css`, componentes de catálogo/landing necesarios; crear `tests/e2e/catalog-admin.spec.ts`, ampliar `tests/e2e/responsive.spec.ts`, `tests/components/product-form.test.tsx`, `home.test.tsx` y `tests/lib/catalog-home.test.ts`. El coordinador integra Header/Footer y `src/app/layout.tsx` con O3.

**Interfaces:** `ProductForm({product?, categories}: {product?: CatalogProduct; categories: Category[]})`; conservar APIs `/api/admin/productos`, `/api/admin/categorias` y permisos actuales con schemas V2. `getFeaturedProducts(): Promise<CatalogProduct[]>`. `Product`/`ProductInput` finales se alinean a `CatalogProduct`/`CatalogProductData` y se retira `legacy-products.ts` con todos sus imports.

- [ ] Escribir `new_category_can_be_assigned_and_filtered`, `create_with_image_retries_same_draft_id`, `edit_form_cannot_set_stock`, `unpriced_draft_cannot_publish` y escenario móvil de lista/edición; `expect(screen.getByRole('button', {name:'Publicar'})).toBeDisabled()` en borrador incompleto. Landing prueba productos reales y WhatsApp desde configuración; sin afirmación fija de abierto o reparto no configurado.
- [ ] Ejecutar `pnpm exec vitest run tests/components/product-form.test.tsx tests/components/home.test.tsx tests/lib/catalog-home.test.ts`; comprobar RED en la experiencia nueva.
- [ ] Implementar filas editables de opciones, categorías reales, estado borrador/publicado y stock inicial solo alta. Crear con foto como borrador→upload→publicar; informar ID guardado y reintento si falla. Lista con imagen, precio desde/pending, categoría, búsqueda/filtros de visibilidad/stock; botones legibles y tokens claros de administración. Landing con título directo, CTA, mascota reutilizada de O3, destacados y categorías pronto en móvil, información concreta de configuración. Si la mascota llega después, integrar en R1; no usar otra identidad. Retirar hero de 85vh, relleno y autoplay innecesario. Activar API V2 con su formulario, retirar puentes/constantes de categorías fijas y eliminar `src/app/lib/products.ts` cuando no queden consumidores; adaptar importador/fixtures pendientes sin dejar una segunda fuente de productos.
- [ ] Ejecutar los tests del paso 2, `pnpm test`, `pnpm test:d1`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e:local`. Revisar 375 px/escritorio, teclado, foco, imágenes, COP y ausencia de overflow. Asegurar que los filtros comparan IDs reales y ninguna compra consume borradores.
- [ ] Commit: `feat: complete product administration and Canva storefront`.

## Cierre del bloque

La carta está cargable y editable sin inventar datos faltantes; alta/edición/imagen/categoría se comprueban de principio a fin localmente. Precios de tarjetas, personalizador, servidor y snapshots nuevos coinciden. Pendientes comerciales aparecen como borradores visibles en administración. No se ha escrito en el catálogo remoto.
