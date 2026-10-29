# Configuración Operativa Canónica

## Objetivo

Usar `configuracion/principal` de Firestore como única fuente pública para el número de WhatsApp, horarios, zonas y mensajes de la tienda. La portada y los consumidores existentes deben dejar de mostrar datos WhatsApp hardcodeados o depender de una variable pública que el panel no modifica.

## Problema comprobado

- `src/app/page.tsx` y `src/components/layout/Footer.tsx` muestran `573245545530` directamente.
- `/api/configuration` actualmente puede devolver `DEFAULT_STORE_CONFIGURATION`, cuyo WhatsApp es `573000000000`, cuando el documento falta o es inválido.
- Checkout y páginas de estado consumen `/api/configuration`, mientras la portada y el footer usan valores independientes.
- `NEXT_PUBLIC_WHATSAPP_PHONE` aparece en `.env.example` y `README.md`, pero no controla los entrypoints reales.

## Decisiones

- Firestore `configuracion/principal` es la fuente única para runtime público.
- La configuración pública debe estar validada por `storeConfigurationSchema` antes de responder.
- Si el documento falta o no es válido, el endpoint público responde `503` con un mensaje genérico y no expone valores internos ni datos parciales.
- El panel admin puede leer valores iniciales para completar la configuración, pero esos valores solo sirven para edición local del formulario; no se entregan como configuración pública de producción.
- No se escriben documentos remotos como parte de esta tarea.
- Se elimina `NEXT_PUBLIC_WHATSAPP_PHONE` del contrato documentado porque ya no tiene consumidor válido.

## Arquitectura y flujo

1. `src/lib/firestore/configuration.ts` mantiene la validación y expone una lectura estricta para runtime público.
2. `src/app/api/configuration/route.ts` transforma configuración ausente o inválida en `503` y conserva respuestas JSON seguras.
3. `src/app/page.tsx` obtiene la configuración desde la capa servidor y solo muestra enlaces/textos WhatsApp cuando existe una configuración válida.
4. `src/components/layout/Footer.tsx` consulta `/api/configuration` y solo muestra el contacto configurado después de una respuesta válida.
5. `src/app/checkout/page.tsx`, `src/app/order-status/[id]/page.tsx` y `src/app/cuenta/pedidos/[id]/page.tsx` conservan el endpoint como contrato de configuración; sus estados de carga/error no deben inventar un número de contacto.
6. `src/app/admin/configuracion/page.tsx` conserva el flujo de edición y guardado mediante `/api/admin/configuration`.

## Contrato HTTP

Respuesta válida:

```json
{
  "configuration": {
    "whatsappNumber": "573245545530",
    "businessHours": [],
    "deliveryZones": [],
    "estimatedDeliveryMinutes": 45,
    "messages": {
      "orderReceived": "...",
      "orderStatus": "...",
      "unavailable": "..."
    }
  }
}
```

Configuración ausente o inválida:

```json
{
  "error": "La configuración de la tienda no está disponible"
}
```

HTTP status: `503`.

## Pruebas y aceptación

- La configuración válida de Firestore llega al endpoint sin sustitución por defaults.
- La ausencia o invalidez del documento produce `503` en el endpoint público.
- El endpoint no filtra excepciones, credenciales ni datos de Firestore.
- La portada genera sus dos enlaces WhatsApp con el número de configuración.
- El footer muestra el número configurado y no contiene un teléfono hardcodeado.
- Checkout y páginas de pedido no generan enlaces WhatsApp con un número por defecto cuando la configuración no está disponible.
- El panel admin conserva su capacidad de cargar valores iniciales y guardar una configuración válida.
- `.env.example` y `README.md` ya no presentan `NEXT_PUBLIC_WHATSAPP_PHONE` como contrato activo.
- Las pruebas existentes de pedidos, configuración, auth, typecheck, lint y build continúan pasando.

## Fuera de alcance

- No se implementa rate limiting del Sugeridor AI.
- No se integra la API oficial de WhatsApp.
- No se modifica el esquema de Firestore ni se ejecuta seed/migración.
- No se rediseña la interfaz ni se cambia el contenido del menú externo de Canva.
