# Configuración Operativa Canónica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que `configuracion/principal` sea la única fuente pública para WhatsApp y configuración operativa, evitando defaults silenciosos y valores hardcodeados.

**Architecture:** La capa Firestore ofrecerá una lectura estricta para runtime público y una lectura con defaults solo para el formulario admin. `/api/configuration` expondrá un contrato `200/503`; la portada y el footer usarán esa configuración para construir los enlaces WhatsApp, mientras los consumidores existentes dejarán de iniciar con configuración operativa inventada.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase Admin/Firestore, Zod, Vitest, Testing Library.

## Global Constraints

- Firestore `configuracion/principal` es la única fuente pública de runtime.
- Si falta o es inválida, la API pública responde `503` con un mensaje genérico y no entrega defaults.
- El panel admin puede usar defaults únicamente para editar y guardar la configuración.
- No escribir documentos remotos, ejecutar seeds ni migraciones.
- No exponer credenciales, excepciones internas ni datos parciales.
- Mantener el alias `@/*`, los módulos `server-only` en servidor y las verificaciones de auth existentes.
- Seguir TDD: cada comportamiento nuevo comienza con una prueba que falla y se verifica con Vitest antes de implementar.

---

## Mapa De Archivos

- Modificar `src/lib/firestore/configuration.ts`: lectura estricta/opcional y error de configuración no disponible.
- Modificar `src/app/api/configuration/route.ts`: contrato seguro `200/503/500`.
- Modificar `src/app/api/admin/configuration/route.ts`: permitir defaults solo al cargar el formulario admin.
- Modificar `src/lib/orders/whatsapp-message.ts`: exportar constructor de enlace WhatsApp sin mensaje de pedido.
- Modificar `src/app/page.tsx`: leer configuración en servidor y eliminar números hardcodeados.
- Modificar `src/components/layout/Footer.tsx`: cargar configuración pública y eliminar número hardcodeado.
- Modificar `src/app/checkout/page.tsx`: no inicializar configuración operativa con defaults de producción.
- Modificar `.env.example`, `README.md` y `AGENTS.md`: retirar `NEXT_PUBLIC_WHATSAPP_PHONE` como contrato activo.
- Modificar `tests/lib/configuration.test.ts`: cubrir la política de lectura estricta y defaults admin.
- Crear `tests/api/configuration.test.ts`: cubrir respuestas `200`, `503` y `500`.
- Modificar `tests/lib/whatsapp-message.test.ts`: cubrir el enlace WhatsApp canónico.
- Crear `tests/components/home.test.tsx`: verificar que la portada usa el número configurado.
- Crear `tests/components/footer.test.tsx`: verificar que el footer muestra el número entregado por la API y no un fallback.

## Task 1: Contrato Estricto De Configuración

**Files:**
- Modify: `src/lib/firestore/configuration.ts`
- Modify: `src/app/api/configuration/route.ts`
- Modify: `src/app/api/admin/configuration/route.ts`
- Test: `tests/lib/configuration.test.ts`
- Create: `tests/api/configuration.test.ts`

**Interfaces:**
- `getStoreConfiguration(options?: { allowDefaults?: boolean }): Promise<StoreConfiguration>`.
- `StoreConfigurationUnavailableError` representa documento ausente o datos inválidos.
- `/api/configuration` devuelve `{ configuration }` con `200`, `{ error: "La configuración de la tienda no está disponible" }` con `503`, o `{ error: "No fue posible completar la solicitud" }` con `500`.
- `/api/admin/configuration` llama `getStoreConfiguration({ allowDefaults: true })` para que el formulario pueda iniciar una configuración.

- [ ] **Step 1: Escribir la prueba de lectura estricta que falla**

En `tests/lib/configuration.test.ts`, mockear `getAdminDb()` con un documento inexistente y agregar estas expectativas: `getStoreConfiguration()` rechaza con `StoreConfigurationUnavailableError`, mientras `getStoreConfiguration({ allowDefaults: true })` devuelve `DEFAULT_STORE_CONFIGURATION`. Agregar otro caso con un documento que contiene un `whatsappNumber` inválido y esperar el mismo rechazo estricto.

- [ ] **Step 2: Ejecutar la prueba RED**

Run: `npx vitest run tests/lib/configuration.test.ts`

Expected: FAIL porque `getStoreConfiguration` todavía no acepta opciones ni distingue lectura pública de lectura admin.

- [ ] **Step 3: Implementar la lectura estricta mínima**

En `src/lib/firestore/configuration.ts`:

```ts
export class StoreConfigurationUnavailableError extends Error {
  constructor() {
    super("La configuración de la tienda no está disponible");
    this.name = "StoreConfigurationUnavailableError";
  }
}

export async function getStoreConfiguration(
  options: { allowDefaults?: boolean } = {},
): Promise<StoreConfiguration> {
  const snapshot = await getAdminDb().collection("configuracion").doc("principal").get();
  if (!snapshot.exists) {
    if (options.allowDefaults) return DEFAULT_STORE_CONFIGURATION;
    throw new StoreConfigurationUnavailableError();
  }

  const parsed = storeConfigurationSchema.safeParse(snapshot.data());
  if (parsed.success) return parsed.data;
  if (options.allowDefaults) return DEFAULT_STORE_CONFIGURATION;
  throw new StoreConfigurationUnavailableError();
}
```

Mantener `updateStoreConfiguration` y su validación sin cambios de contrato.

- [ ] **Step 4: Verificar GREEN de la capa Firestore**

Run: `npx vitest run tests/lib/configuration.test.ts`

Expected: PASS.

- [ ] **Step 5: Escribir pruebas RED del endpoint**

Crear `tests/api/configuration.test.ts` con mocks de `getStoreConfiguration` y tres casos:

```ts
it("devuelve configuración válida", async () => {
  getStoreConfiguration.mockResolvedValue(validConfiguration);
  const response = await GET();
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ configuration: validConfiguration });
});

it("devuelve 503 cuando la configuración no está disponible", async () => {
  getStoreConfiguration.mockRejectedValue(new StoreConfigurationUnavailableError());
  const response = await GET();
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: "La configuración de la tienda no está disponible" });
});
```

Agregar un tercer caso con `new Error("fallo interno")` y esperar `500` con el mensaje genérico, no el texto de la excepción.

- [ ] **Step 6: Ejecutar la prueba RED del endpoint**

Run: `npx vitest run tests/api/configuration.test.ts`

Expected: FAIL porque la ruta actual no captura errores ni devuelve `503`.

- [ ] **Step 7: Implementar el contrato HTTP**

En `src/app/api/configuration/route.ts`, envolver `getStoreConfiguration()` en `try/catch`; mapear `StoreConfigurationUnavailableError` a `503` y cualquier otro error a `500` con `No fue posible completar la solicitud`. No devolver `error.message` para errores desconocidos.

En `src/app/api/admin/configuration/route.ts`, usar `getStoreConfiguration({ allowDefaults: true })` solo en `GET`; conservar `requirePermission` y el flujo `PUT`.

- [ ] **Step 8: Verificar GREEN de la API**

Run: `npx vitest run tests/lib/configuration.test.ts tests/api/configuration.test.ts`

Expected: PASS.

## Task 2: Enlace WhatsApp Y Portada

**Files:**
- Modify: `src/lib/orders/whatsapp-message.ts`
- Modify: `src/app/page.tsx`
- Test: `tests/lib/whatsapp-message.test.ts`
- Create: `tests/components/home.test.tsx`

**Interfaces:**
- `buildWhatsAppLink(phone: string): string` devuelve `https://wa.me/<número normalizado>`.
- La portada usa `getStoreConfiguration()` en servidor; si la lectura falla, no renderiza enlaces ni teléfono WhatsApp.

- [ ] **Step 1: Escribir la prueba RED del enlace**

En `tests/lib/whatsapp-message.test.ts`, agregar:

```ts
it("construye un enlace WhatsApp desde el número configurado", () => {
  expect(buildWhatsAppLink("+57 324 555 0000")).toBe("https://wa.me/573245550000");
});
```

- [ ] **Step 2: Ejecutar la prueba RED**

Run: `npx vitest run tests/lib/whatsapp-message.test.ts`

Expected: FAIL porque `buildWhatsAppLink` no existe.

- [ ] **Step 3: Implementar el helper mínimo**

Extraer la normalización existente de `buildWhatsAppMessage` a una función reutilizable y exportar `buildWhatsAppLink`. `buildWhatsAppMessage` debe seguir generando exactamente el mismo formato actual, usando el helper nuevo para el prefijo `https://wa.me/`.

- [ ] **Step 4: Verificar GREEN del helper**

Run: `npx vitest run tests/lib/whatsapp-message.test.ts`

Expected: PASS.

- [ ] **Step 5: Escribir prueba de regresión de portada**

Agregar una prueba de componente o renderizado que mockee `getFeaturedProducts` y `getStoreConfiguration` con `whatsappNumber: "573245550000"`; comprobar que el HTML renderizado contiene `https://wa.me/573245550000` y no contiene `573245545530`.

- [ ] **Step 6: Ejecutar la prueba RED de portada**

Run: `npx vitest run tests/components/home.test.tsx`

Expected: FAIL porque la portada todavía contiene el número hardcodeado y no lee configuración.

- [ ] **Step 7: Conectar la portada a Firestore**

En `src/app/page.tsx`, leer `getStoreConfiguration()` junto con los productos destacados. Calcular `const whatsappHref = configuration ? buildWhatsAppLink(configuration.whatsappNumber) : null`; renderizar los dos enlaces y el texto del teléfono solo cuando `whatsappHref` exista. No usar `DEFAULT_STORE_CONFIGURATION` como fallback público.

- [ ] **Step 8: Verificar GREEN de portada y regresión**

Run: `npx vitest run tests/lib/whatsapp-message.test.ts tests/components/home.test.tsx`

Expected: PASS.

## Task 3: Footer, Checkout Y Contratos Documentales

**Files:**
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/app/checkout/page.tsx`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `tests/components/footer.test.tsx`

**Interfaces:**
- El footer obtiene `{ configuration?: StoreConfiguration }` desde `/api/configuration`; si la respuesta no es `200`, no muestra un número ni enlace WhatsApp.
- Checkout usa una configuración nullable y un mensaje genérico local solo como mensaje técnico de error, no como configuración operativa persistida.

- [ ] **Step 1: Escribir la prueba RED del footer**

Crear `tests/components/footer.test.tsx` y mockear `usePathname` para una ruta pública y `global.fetch` con una respuesta válida. Renderizar `Footer`, esperar `WhatsApp: 573245550000`, y agregar un caso de respuesta `503` que espere que el teléfono no aparezca.

- [ ] **Step 2: Ejecutar la prueba RED**

Run: `npx vitest run tests/components/footer.test.tsx`

Expected: FAIL porque el footer muestra siempre `324 554 5530` y no consulta la API.

- [ ] **Step 3: Implementar carga pública del footer**

Agregar estado `StoreConfiguration | null`, cargar `/api/configuration` en `useEffect`, ignorar respuestas no exitosas y construir el enlace con `buildWhatsAppLink(configuration.whatsappNumber)`. Renderizar el bloque de contacto solo con configuración válida; mantener la ocultación de rutas `/admin`.

- [ ] **Step 4: Verificar GREEN del footer**

Run: `npx vitest run tests/components/footer.test.tsx`

Expected: PASS.

- [ ] **Step 5: Eliminar defaults operativos de checkout**

En `src/app/checkout/page.tsx`, retirar `DEFAULT_STORE_CONFIGURATION` del estado inicial. Usar `StoreConfiguration | null` y seleccionar el mensaje de error configurado solo si existe; si no, usar un texto genérico fijo como `No pudimos procesar el pedido.`. No introducir ningún número WhatsApp ni horario alternativo.

- [ ] **Step 6: Retirar el contrato de variable obsoleto**

Eliminar `NEXT_PUBLIC_WHATSAPP_PHONE` de `.env.example` y de la sección de variables públicas de `README.md`. Actualizar `AGENTS.md` para indicar que WhatsApp se administra mediante `configuracion/principal`, no mediante una variable pública.

- [ ] **Step 7: Verificar consumidores y documentación**

Run: `npx vitest run tests/components/footer.test.tsx tests/lib/configuration.test.ts tests/api/configuration.test.ts`

Expected: PASS. Confirmar con búsqueda que `NEXT_PUBLIC_WHATSAPP_PHONE`, `wa.me/573245545530` y `WhatsApp: 324 554 5530` ya no aparecen en código runtime.

## Task 4: Gate Integral Y Revisión De Seguridad

**Files:**
- Modify only files covered by Tasks 1-3 if a test exposes a regression.

- [ ] **Step 1: Ejecutar la suite unitaria completa**

Run: `npm test`

Expected: todos los tests pasan; `tests/e2e/**` permanece excluido por configuración.

- [ ] **Step 2: Ejecutar typecheck y lint**

Run: `npm run typecheck`

Run: `npm run lint`

Expected: ambos comandos terminan con código 0.

- [ ] **Step 3: Ejecutar reglas Firestore en emulator**

Run: `npm run test:firestore-rules`

Expected: 5 casos aprobados y ningún acceso remoto.

- [ ] **Step 4: Ejecutar build**

Run: `npm run build`

Expected: build Next.js con Webpack termina correctamente.

- [ ] **Step 5: Revisar seguridad y diff**

Run: `npm audit --omit=dev --audit-level=high`

Run: `git diff --check`

Revisar que el cambio no exponga secretos, no altere permisos de rutas protegidas, no escriba Firebase remoto y no deje artefactos generados no relacionados.

- [ ] **Step 6: Dejar estado para revisión humana**

Run: `git status --short`

No crear commit automáticamente. Reportar los resultados reales, cualquier vulnerabilidad preexistente de `npm audit` y los archivos modificados.

## Self-Review Del Plan

- La especificación queda cubierta por Tasks 1-4: contrato estricto, consumidores, documentación, pruebas y gate.
- No quedan placeholders, nombres de funciones ambiguos ni comandos sin ruta concreta.
- `StoreConfigurationUnavailableError`, `getStoreConfiguration({ allowDefaults })` y `buildWhatsAppLink` tienen firmas consistentes entre tareas.
- Los defaults quedan limitados al GET admin; runtime público usa lectura estricta.
- No se incluyen rate limiting AI, WhatsApp API, migraciones, seeds ni rediseño de Canva.
