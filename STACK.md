# Stack propuesto para Coctels OPS

Fecha: 2026-10-18. Estado: diseño aprobado por el operador; plan de implementación preparado para revisión. Infraestructura y código de producto pendientes de ejecución.

El estado ejecutable actual continúa siendo Next.js con Firestore y hosting Vercel. Este documento describe el destino solicitado; no certifica una migración realizada.

## Decisiones de arquitectura

- Mantener Next.js App Router y usar OpenNext sobre Cloudflare Workers. Verificar compatibilidad de la versión exacta, build y preview en workerd. OpenNext advierte limitaciones de soporte Windows: añadir comprobación en Linux/CI antes de aceptar un despliegue de producción.
- Cloudflare D1 como base de datos operativa completa; Cloudflare R2 para imágenes y archivos. Usar bindings privados `DB` y `CATALOG_IMAGES` en el servidor, además de `ASSETS` y almacenamiento de caché requerido por el adaptador.
- Firebase exclusivamente para Auth, verificación de correo y claims; los perfiles, direcciones y permisos se guardan en D1. Verificación de ID token compatible con Workers mediante claves públicas oficiales.
- Chat Opsy Bot mediante `fetch` servidor a DeepSeek, con `DEEPSEEK_API_KEY` como secreto y `DEEPSEEK_MODEL` configurable. Propuesta inicial: `deepseek-flash`, razonamiento desactivado y límites de consumo.
- Conservar un único despliegue modular. No añadir microservicios, vectorización ni almacenamiento de conversaciones sin una necesidad comprobada.

Alternativas y consecuencias en [ADR-001](docs/adr/001-cloudflare-d1-firebase-auth.md). Requisitos y criterios completos en el [diseño](docs/superpowers/specs/2026-10-18-cloudflare-catalogo-opsy-design.md).

## Identidad visual

Referencias propias: [carta Canva](https://www.canva.com/design/DAGH-niw4JE/k5gQ3oLt677WeTMFQouJYQ/edit), aplicación OPS existente y panda Opsy adjunto en la conversación. La referencia Sarin Bot orienta a un asistente conversacional; no se pudo verificar su interfaz durante esta revisión.

Negro para fondo de tienda, magenta para acciones, cian para acentos funcionales y violeta tomado del panda. Mantener tipografía de marca ya disponible y cuerpo legible. Tienda expresiva y panel operativo con tokens consistentes y contraste alto. Evitar antetítulos decorativos, secciones de relleno, iconos repetidos y precios o disponibilidad inferidos. Las fotografías corresponden a productos comprobados.

## Costos orientativos

Estimación de escenario, no cotización ni verificación de la facturación de la cuenta. Tarifas consultadas el 2026-10-18; cuotas gratuitas/compartidas pueden estar siendo consumidas por otros proyectos.

| Servicio | Supuesto | Estimación |
| --- | --- | --- |
| Workers Paid | Plan de pago base; tráfico/CPU dentro de lo incluido | Desde USD 5/mes |
| D1 | Datos y consultas de una tienda pequeña dentro de lo incluido en Paid | Sin sobrecargo en ese escenario |
| R2 Standard | Imágenes/operaciones dentro de la cuota gratuita de la cuenta | Sin sobrecargo en ese escenario |
| DeepSeek Flash | 1.000 respuestas/mes, 2.000 tokens de entrada y 400 de salida por respuesta | USD 0,54–1,08/mes según horario |

Total ilustrativo: USD 5,54–6,08/mes, antes de impuestos, sobreconsumos, optimización de imágenes/caché y posibles costos de Auth. El contexto real del catálogo y del historial puede superar el supuesto de 2.000 tokens; medir uso devuelto por el proveedor antes de proyectar gasto real. El límite diario propuesto no garantiza ese total mensual: es una barrera técnica adicional.

Se propone un tope inicial global de 1.000 solicitudes de chat por día y 5 por identidad cada diez minutos, más límites de historial, mensaje, salida y timeout. Son valores configurables de implementación, no gasto autorizado ni límites ya configurados en la cuenta.

Alertas de facturación y topes del proveedor: **sin verificar**; no se inspeccionaron ajustes de las cuentas. Hallazgo de costo de severidad media: exposición a consumo variable si se activa el chat sin controles. Verificar alertas al preparar el despliegue; la comprobación no autoriza activar planes de pago.

Fuentes: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [R2](https://developers.cloudflare.com/r2/pricing/), [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/).

## Secretos y destino

La guía de implementación dejará `DEEPSEEK_API_KEY` en `.env.local` para desarrollo Next o `.dev.vars` para preview Workers, ambos ignorados. En producción: Worker → Settings → Variables and Secrets → Secret. Configuración separada por entorno; jamás `NEXT_PUBLIC_DEEPSEEK_API_KEY`.

No se han creado recursos, cargado claves, migrado datos ni cambiado dominios. Cuenta, Worker, base y bucket concretos se revisarán antes de cualquier acción remota, con respaldo verificable y confirmación del operador como exige AGENTS.md.
