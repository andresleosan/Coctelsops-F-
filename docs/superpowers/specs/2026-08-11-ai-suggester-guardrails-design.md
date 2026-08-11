# Guardrails Del Sugeridor AI

## Objetivo

Mantener el Sugeridor de Sabores accesible sin iniciar sesión, pero limitar entradas y fallos antes de invocar Gemini. El usuario solo debe autenticarse cuando abandona la sugerencia y entra al flujo real de compra desde el menú.

## Problema comprobado

- `src/app/ai-suggest/page.tsx` llama directamente a una server action sin autenticación.
- `src/ai/flows/ai-flavor-suggester.ts` acepta cualquier string, sin longitud mínima o máxima.
- El flujo no limita la salida del modelo ni establece timeout.
- El cliente registra el error completo con `console.error(error)`.
- El botón `Pedir Esta Mezcla` no crea una compra; solo muestra una notificación de funcionalidad futura.
- Genkit usa `googleai/gemini-2.5-flash`; el repositorio no demuestra una cuota, alerta o presupuesto configurado para este uso.

## Decisiones

- El Sugeridor permanece anónimo.
- La autenticación no se agrega al flujo de sugerencia; el login existente del checkout queda como barrera de compra.
- La entrada válida se recorta, exige al menos 3 caracteres y limita `preferences` a 240 caracteres.
- La salida se valida y limita: nombre hasta 80 caracteres, descripción hasta 300, máximo 8 ingredientes y cada ingrediente hasta 60 caracteres.
- La llamada al proveedor tendrá un timeout de 10 segundos y devolverá un error controlado si se agota o falla.
- El cliente no muestra errores del proveedor ni registra prompts o excepciones crudas.
- El CTA cambia a `Ver menú y pedir` y navega a `/menu`; no crea SKU, precio, inventario ni pedido desde texto generado.
- No se agrega un proveedor externo de rate limiting en esta tarea. La producción debe tener una alerta/límite de facturación configurado en Google AI/Cloud antes de habilitar tráfico significativo.

## Flujo

1. El usuario escribe preferencias en `/ai-suggest` sin sesión.
2. La server action valida y normaliza el texto antes de crear el prompt.
3. Genkit intenta generar una respuesta dentro de 10 segundos.
4. La respuesta se valida contra el schema limitado.
5. Si el proveedor falla, expira o devuelve una forma inválida, el servidor lanza un error controlado y el cliente muestra el mensaje genérico actual.
6. `Ver menú y pedir` lleva a `/menu`; el checkout existente continúa redirigiendo a login y luego a verificación de email.

## Contratos internos

Entrada:

```ts
type AIFlavorSuggesterInput = {
  preferences: string;
};
```

Salida válida:

```ts
type AIFlavorSuggesterOutput = {
  flavorName: string;
  description: string;
  ingredients: string[];
};
```

Errores del proveedor, timeout y salida inválida no se exponen como texto técnico al cliente. El cliente conserva un único mensaje genérico: `No pudimos generar una sugerencia en este momento.`

## Costo y operación

- No se agrega un servicio facturable nuevo; Gemini ya forma parte del stack actual.
- No hay volumen de solicitudes documentado suficiente para calcular un costo mensual defendible.
- Antes de producción o una campaña, el operador debe configurar alerta y límite de facturación para el proyecto que usa Gemini.
- El timeout limita la espera del usuario, pero no reemplaza un límite de cuota del proveedor.
- Rate limiting distribuido, CAPTCHA/Turnstile y cuotas persistentes por IP quedan como siguiente decisión si el tráfico anónimo crece.

## Pruebas y aceptación

- Entradas vacías, recortadas, menores a 3 o mayores a 240 caracteres no invocan Gemini.
- La entrada válida llega normalizada al flujo.
- Una salida con campos demasiado largos o más de 8 ingredientes se rechaza.
- Un proveedor que tarda más de 10 segundos produce un error controlado.
- Un fallo del proveedor produce un error controlado sin filtrar su mensaje.
- La página no registra el error crudo en consola.
- El CTA visible es `Ver menú y pedir` y apunta a `/menu`.
- La funcionalidad existente de login/verificación del checkout no cambia.
- Las pruebas existentes, typecheck, lint y build continúan pasando.

## Fuera de alcance

- No se implementa login para generar sugerencias.
- No se crea un producto AI personalizado ni se toca el esquema de pedidos.
- No se integra un proveedor de rate limiting, CAPTCHA, pagos o WhatsApp.
- No se cambia el modelo Gemini ni se ejecutan cambios remotos de facturación.
