# Rate Limiting Del Sugeridor AI

## Objetivo

Limitar el abuso anónimo del Sugeridor AI a cinco solicitudes por IP cada diez minutos, sin guardar IPs crudas, prompts, respuestas ni introducir un proveedor externo de rate limiting.

## Alcance

- Solo aplica a `aiFlavorSuggester`.
- Conserva el acceso anónimo y el flujo de compra existente.
- Conserva la validación de preferencias de 3 a 240 caracteres.
- Conserva la validación de salida y el timeout de 10 segundos.
- No agrega autenticación, CAPTCHA, pagos, productos AI ni pedidos.

## Identidad Y Privacidad

La identidad de límite se obtiene en este orden: `cf-connecting-ip`, primera entrada de `x-forwarded-for` y `x-real-ip`. El valor se recorta, se normaliza y se convierte en un HMAC-SHA256 usando `AI_RATE_LIMIT_SECRET`. Firestore solo recibe el digest; nunca se persiste la IP cruda, el prompt, la respuesta ni errores técnicos.

Si no existe un header de IP confiable, la solicitud cae en un bucket anónimo compartido, evitando confiar en un valor controlado por el cliente como identidad pública. Fuera de emuladores, la ausencia de `AI_RATE_LIMIT_SECRET` falla cerrado antes de invocar Gemini. Los tests/emuladores proporcionan un secreto efímero por entorno.

## Persistencia Y Atomicidad

Cada límite vive en `ai_rate_limits/{digest}` con:

```ts
type AIRateLimitRecord = {
  windowStartedAt: Timestamp;
  count: number;
  updatedAt: Timestamp;
};
```

La operación usa una transacción Firestore:

1. Si no existe el documento, crea la ventana con `count = 1`.
2. Si la ventana de diez minutos sigue vigente y `count < 5`, incrementa el contador.
3. Si la ventana sigue vigente y `count >= 5`, rechaza sin invocar Gemini.
4. Si la ventana expiró, reinicia el contador a `1`.

Los documentos no se eliminan durante la solicitud. Su expiración lógica ocurre cuando llega una solicitud posterior; la limpieza física de documentos antiguos queda fuera de alcance.

## Contrato De Error

El límite excedido usa `AIFlavorSuggesterError` con el mismo mensaje genérico existente: `No pudimos generar una sugerencia en este momento.` La UI no distingue rate limit, timeout, proveedor caído o salida inválida.

## Configuración

Agregar `AI_RATE_LIMIT_SECRET` a `.env.example` como variable privada de servidor. Nunca debe comenzar con `NEXT_PUBLIC_`, aparecer en logs, tests versionados o respuestas.

## Pruebas Y Aceptación

- Las cinco primeras solicitudes dentro de la ventana pueden continuar.
- La sexta solicitud dentro de la ventana se rechaza y no invoca Gemini.
- Una ventana vencida permite una nueva solicitud.
- Solicitudes concurrentes no pueden superar cinco accesos aceptados para el mismo digest.
- Las IPs no aparecen en documentos, logs ni errores.
- Headers de proxy se interpretan en el orden documentado.
- El secreto faltante fuera de emuladores falla cerrado.
- El límite no cambia el timeout, los schemas ni el mensaje genérico.
- Las pruebas existentes, typecheck, lint, build, reglas Firestore y E2E local continúan pasando.

## Costos Y Operación

- No se agrega un proveedor facturable nuevo.
- Firestore genera lecturas/escrituras por solicitud; el volumen exacto depende del tráfico.
- Los documentos de límite pueden acumularse; TTL o limpieza programada quedan como decisión posterior si el volumen lo justifica.
- La alerta de facturación existente de `USD 1` sigue siendo el control operativo del proyecto.

## Fuera De Alcance

- Rate limiting distribuido externo, Redis, Upstash, CAPTCHA o Turnstile.
- Cuotas por usuario autenticado.
- Borrado físico inmediato de documentos de límite.
- Cambiar Gemini o ajustar sus cuotas remotas.
