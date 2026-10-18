# ADR-001: Workers y D1 con Firebase Auth

Fecha: 2026-10-18.
Estado: propuesta para revisión.

## Contexto

El operador solicita trasladar el hosting desde Vercel y todos los datos operativos desde Firestore a Cloudflare, conservando Firebase únicamente para autenticación. La aplicación existente usa Next.js 16 App Router, APIs protegidas, repositorios Firestore, transacciones de stock/pedidos/auditoría y R2 para imágenes. También requiere completar la gestión de la carta y reemplazar el sugeridor Genkit por Opsy Bot con DeepSeek.

## Decisión propuesta

Mantener Next.js en un solo despliegue de Cloudflare Workers mediante OpenNext, usar D1 para datos operativos y R2 para archivos, y verificar los tokens de Firebase Auth desde el servidor sin utilizar Firestore. Consultar roles y perfiles activos en D1. DeepSeek se invoca desde el servidor con secreto privado y límites atómicos de consumo en D1.

La implementación debe conservar transacciones e idempotencia con SQL y batches cuya validación falle atómicamente. Un contador, un stock o un permiso no se confían al cliente ni a la memoria de una instancia.

## Alternativas consideradas

- **vinext:** Cloudflare lo recomienda actualmente; está en beta y cambia la implementación del framework. Posponer ese cambio evita combinarlo con la migración integral de persistencia. Revisar esta decisión si el build/preview OpenNext de la versión exacta no converge.
- **Pages estático y API aparte:** requiere dividir un sistema que ya depende de renderizado y rutas servidor. Aumenta cambios de contratos/despliegues sin beneficio demostrado en este alcance.
- **Conservar Firestore:** contradice el requisito de datos operativos en Cloudflare; no se admite fallback operativo permanente. Las herramientas de exportación histórica son la única excepción temporal.
- **KV como base principal o contador exacto:** no resuelve las garantías transaccionales y de concurrencia necesarias para pedidos, stock y consumo.

## Consecuencias

Se conservan rutas y componentes existentes, y los datos operativos quedan en el proveedor solicitado. La migración exige reescribir repositorios, adaptar scripts/emuladores y demostrar atomicidad con concurrencia real. Los roles dejan de depender de reglas Firestore: toda operación D1 debe estar protegida por la API.

La compatibilidad declarada de Next 16 con OpenNext se verificará sobre 16.3.8 y el adaptador fijado. Las limitaciones Windows obligan a una validación adicional en Linux/CI antes de producción. No se presume compatible Firebase Admin completo dentro de Workers; las herramientas privilegiadas de Auth permanecen en Node.

Los IDs históricos y snapshots de pedidos se preservan. El corte requiere exportación privada verificada, importación validada, congelación de escrituras y aprobación explícita. Volver después de recibir pedidos en D1 requiere reconciliar ese delta: restaurar únicamente el despliegue anterior no basta.

## Fuentes y detalle

[Diseño del proyecto](../superpowers/specs/2026-10-18-cloudflare-catalogo-opsy-design.md), [Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [OpenNext](https://opennext.js.org/cloudflare), [Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/).
