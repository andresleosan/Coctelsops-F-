# Guardrails Del Sugeridor AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mantener el Sugeridor AI anónimo, limitar su superficie de abuso/costo y llevar la intención de compra al menú real sin crear pedidos desde texto generado.

**Architecture:** La server action valida la entrada antes de invocar Genkit, limita la salida del modelo y aplica un timeout de 10 segundos. La UI conserva el mensaje genérico ante errores, elimina logs crudos y cambia el CTA para navegar a `/menu`, donde el flujo existente exige login al checkout.

**Tech Stack:** Next.js 16 App Router, React 19, Genkit, Gemini 2.5 Flash, Zod, Vitest, Testing Library.

## Global Constraints

- El Sugeridor permanece anónimo; la autenticación se exige únicamente en el flujo existente de compra.
- `preferences` se recorta, exige mínimo 3 caracteres y tiene máximo 240 caracteres.
- La salida limita nombre a 80, descripción a 300, máximo 8 ingredientes y 60 caracteres por ingrediente.
- La llamada al proveedor tiene timeout de 10 segundos y errores controlados.
- No registrar prompts, respuestas completas ni excepciones crudas.
- No agregar proveedor de rate limiting, CAPTCHA, pagos ni producto AI personalizado.
- No cambiar el modelo Gemini ni ejecutar cambios remotos de facturación.
- No crear commits automáticos; dejar el diff para revisión humana.

---

## Mapa De Archivos

- Modificar `src/ai/flows/ai-flavor-suggester.ts`: schemas acotados, error controlado y timeout.
- Modificar `src/app/ai-suggest/page.tsx`: límites de UI, error genérico sin `console.error` y CTA hacia `/menu`.
- Modificar `README.md`: documentar comportamiento anónimo, degradación y requisito de alerta de facturación.
- Crear `tests/lib/ai-flavor-suggester.test.ts`: validar entrada/salida, timeout y fallos del proveedor.
- Crear `tests/components/ai-suggest.test.tsx`: validar error visible y CTA real.

## Task 1: Guardrails De La Server Action

**Files:**
- Modify: `src/ai/flows/ai-flavor-suggester.ts`
- Create: `tests/lib/ai-flavor-suggester.test.ts`

**Interfaces:**
- `AIFlavorSuggesterInputSchema` acepta `preferences` recortado entre 3 y 240 caracteres.
- `AIFlavorSuggesterOutputSchema` acepta `flavorName` hasta 80, `description` hasta 300, máximo 8 ingredientes y 60 caracteres por ingrediente.
- `AIFlavorSuggesterError` expone únicamente un mensaje genérico estable para fallos de proveedor, timeout o salida inválida.
- `aiFlavorSuggester(input)` valida antes de llamar al flow y espera como máximo `10_000` ms.

- [x] **Step 1: Escribir pruebas RED de entrada y proveedor**

Crear `tests/lib/ai-flavor-suggester.test.ts` con un mock de `@/ai/genkit` que capture `definePrompt` y `defineFlow`. El mock debe contar invocaciones del prompt y permitir controlar la promesa del flow. Cubrir:

```ts
it("rechaza preferencias vacías o mayores a 240 sin invocar el flow", async () => {
  await expect(aiFlavorSuggester({ preferences: "  " })).rejects.toThrow();
  await expect(aiFlavorSuggester({ preferences: "a".repeat(241) })).rejects.toThrow();
  expect(flowMock).not.toHaveBeenCalled();
});

it("recorta preferencias antes de invocar el flow", async () => {
  flowMock.mockResolvedValue(validOutput);
  await aiFlavorSuggester({ preferences: "  frutas cítricas  " });
  expect(flowMock).toHaveBeenCalledWith({ preferences: "frutas cítricas" });
});
```

- [x] **Step 2: Ejecutar RED de entrada**

Run: `npx vitest run tests/lib/ai-flavor-suggester.test.ts`

Expected: FAIL porque el schema actual acepta cualquier string y la función pasa el input sin normalizar.

- [x] **Step 3: Implementar validación de entrada**

En `src/ai/flows/ai-flavor-suggester.ts`, convertir el schema actual en un export de Zod con `.trim().min(3).max(240)`. En `aiFlavorSuggester`, ejecutar `AIFlavorSuggesterInputSchema.parse(input)` y pasar el resultado validado a `aiFlavorSuggesterFlow`.

- [x] **Step 4: Verificar GREEN de entrada**

Run: `npx vitest run tests/lib/ai-flavor-suggester.test.ts`

Expected: los casos de entrada pasan y los casos de salida/timeout aún pueden fallar hasta completar los siguientes pasos.

- [x] **Step 5: Escribir pruebas RED de salida, timeout y proveedor**

Agregar casos que hagan fallar el flow con un resultado inválido, un resultado con 9 ingredientes, una promesa que nunca resuelve y un error `provider failure`. Esperar siempre `AIFlavorSuggesterError` con el mensaje `No pudimos generar una sugerencia en este momento.`; para timeout usar fake timers y avanzar `10_001` ms.

- [x] **Step 6: Ejecutar RED de salida y timeout**

Run: `npx vitest run tests/lib/ai-flavor-suggester.test.ts`

Expected: FAIL porque el flow actual no valida salida, no aplica timeout y propaga errores del proveedor.

- [x] **Step 7: Implementar salida limitada y timeout**

Agregar límites al schema de salida y hacer que el callback del flow valide el resultado del prompt antes de devolverlo. En `aiFlavorSuggester`, envolver el flow en una promesa de timeout de `10_000` ms; convertir timeout, excepciones del proveedor y `ZodError` de salida a `AIFlavorSuggesterError` sin conservar el mensaje original.

- [x] **Step 8: Verificar GREEN de la server action**

Run: `npx vitest run tests/lib/ai-flavor-suggester.test.ts`

Expected: todos los casos de entrada, salida, timeout y proveedor pasan.

## Task 2: UI Y CTA De Compra

**Files:**
- Modify: `src/app/ai-suggest/page.tsx`
- Create: `tests/components/ai-suggest.test.tsx`

**Interfaces:**
- La UI conserva el mensaje `No pudimos generar una sugerencia en este momento.` ante cualquier rechazo de la server action.
- El CTA visible después de una sugerencia es `Ver menú y pedir` y navega a `/menu`.

- [x] **Step 1: Escribir pruebas RED de UI**

Crear `tests/components/ai-suggest.test.tsx`, mockear `aiFlavorSuggester`, `useToast` y `next/link`, y cubrir:

```ts
it("muestra un enlace al menú después de una sugerencia", async () => {
  aiFlavorSuggester.mockResolvedValue(validOutput);
  render(<AISuggestPage />);
  fireEvent.change(screen.getByLabelText(/Ejemplo:/), { target: { value: "algo cítrico" } });
  fireEvent.click(screen.getByRole("button", { name: "Generar Receta Única" }));
  expect(await screen.findByRole("link", { name: "Ver menú y pedir" })).toHaveAttribute("href", "/menu");
});

it("muestra error genérico sin escribir la excepción en consola", async () => {
  const error = new Error("provider secret or prompt data");
  aiFlavorSuggester.mockRejectedValue(error);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(<AISuggestPage />);
  fireEvent.change(screen.getByLabelText(/Ejemplo:/), { target: { value: "algo cítrico" } });
  fireEvent.click(screen.getByRole("button", { name: "Generar Receta Única" }));
  expect(await screen.findByText("No pudimos generar una sugerencia en este momento.")).toBeInTheDocument();
  expect(consoleError).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Ejecutar RED de UI**

Run: `npx vitest run tests/components/ai-suggest.test.tsx`

Expected: FAIL porque el CTA actual muestra una notificación de funcionalidad futura y el catch registra la excepción.

- [x] **Step 3: Implementar comportamiento mínimo de UI**

En `src/app/ai-suggest/page.tsx`, agregar `maxLength={240}` al input, eliminar `console.error(error)`, conservar el toast con el mensaje genérico y reemplazar el botón de funcionalidad futura por un `Button` con `asChild` y `Link href="/menu"`, texto `Ver menú y pedir`.

- [x] **Step 4: Verificar GREEN de UI**

Run: `npx vitest run tests/components/ai-suggest.test.tsx`

Expected: ambos casos pasan y no se registra el error crudo.

## Task 3: Documentación Operativa Y Costo

**Files:**
- Modify: `README.md`

- [x] **Step 1: Escribir prueba/documentación de contrato**

No se agrega lógica nueva en esta tarea; comprobar mediante búsqueda que README no documenta una cuota inexistente ni promete compra directa desde la sugerencia.

- [x] **Step 2: Actualizar README**

Agregar una sección `Sugeridor AI` que documente: acceso anónimo, límite de 240 caracteres, timeout de 10 segundos, degradación genérica ante fallo, navegación al menú para comprar y login existente en checkout. Indicar que Gemini es un servicio con facturación por uso y que antes de tráfico significativo se debe configurar alerta/límite en Google AI/Cloud. No incluir claves ni valores secretos.

- [x] **Step 3: Verificar documentación**

Run: `git diff --check`

Expected: sin errores de whitespace.

## Task 4: Gate Integral

**Files:**
- Modify only files from Tasks 1-3 if a verification exposes a regression.

- [x] **Step 1: Ejecutar pruebas enfocadas**

Run: `npx vitest run tests/lib/ai-flavor-suggester.test.ts tests/components/ai-suggest.test.tsx`

Expected: todos los casos AI pasan.

- [x] **Step 2: Ejecutar suite y análisis estático**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run lint`

Expected: código 0; los skips existentes deben permanecer explícitos.

- [x] **Step 3: Ejecutar build y QA local**

Run: `npm run build`

Run: `npm run test:firestore-rules`

Run: `npm run test:e2e:local`

Expected: build correcto, reglas aprobadas y E2E local sin fallos funcionales.

- [x] **Step 4: Revisar seguridad, costos y artefactos**

Run: `npm audit --omit=dev --audit-level=high`

Run: `git diff --check`

Revisar que no se filtren prompts/respuestas en logs, que no se agreguen credenciales, que no se agreguen dependencias facturables y que no queden artefactos generados no relacionados.

- [x] **Step 5: Dejar el cambio para revisión humana**

Run: `git status --short`

No crear commit automático. Reportar evidencia, vulnerabilidades preexistentes y el requisito pendiente de alerta/límite de facturación del proveedor.

## Self-Review Del Plan

- La especificación queda cubierta por Tasks 1-4: guardrails, UI, CTA, documentación, costo y gates.
- No hay placeholders ni nombres de interfaces inconsistentes.
- `AIFlavorSuggesterError`, schemas acotados, timeout y CTA están definidos entre tareas.
- La cuota distribuida queda explícitamente fuera de alcance y no se presenta como resuelta.
- No se crea producto AI, SKU, precio, pedido, proveedor nuevo ni autenticación previa a la sugerencia.
