# Coctels OPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la tienda, administración y Opsy Bot del diseño aprobado, con todos los datos operativos y hosting en Cloudflare y Firebase exclusivamente para Auth.

**Architecture:** Conservar Next.js App Router, adaptar el servidor a Workers mediante OpenNext y sustituir Firestore por repositorios D1. R2 sirve imágenes mediante binding; DeepSeek recibe únicamente contexto público limitado y su respuesta se valida antes de presentarla. La implementación local y el corte remoto tienen cierres separados.

**Tech Stack:** Next.js 16.3.8, React 19, TypeScript, pnpm, OpenNext Cloudflare, Wrangler, D1, R2, Firebase Auth, DeepSeek mediante fetch, Vitest y Playwright.

**Spec:** [Diseño aprobado](../specs/2026-10-18-cloudflare-catalogo-opsy-design.md), aprobado por el operador en esta conversación el 2026-10-18. [STACK](../../../STACK.md) y [ADR-001](../../adr/001-cloudflare-d1-firebase-auth.md).

## Global Constraints

- «D1 contiene perfiles, direcciones, roles, permisos, productos, categorías, pedidos, promociones, inventario, notificaciones, auditoría, configuración y controles de consumo del chat.»
- «Firebase conserva identidades, login, recuperación, verificación de correo y custom claims.»
- «Se mantienen IDs y Firebase UID existentes»; no normalizar a minúsculas IDs históricos.
- «formularios y API expresan COP con máximo dos decimales; D1 persiste enteros en centavos de COP (escala 100), dentro de rango seguro.»
- «No truncar, omitir registros ni recalcular importes de pedidos históricos.» Importes con más de dos decimales detienen el corte para revisión explícita.
- «Administrador requiere claim `admin === true` y perfil `accountType === "admin"`»; perfil activo, roles activos, propiedad por UID y correo verificado para comprar.
- «La edición de texto/precio no sobrescribe stock que cambió desde checkout.»
- «Se retiran los multiplicadores globales `0.8 / 1 / 1.3`» del catálogo y checkout nuevos.
- «Borradores con precio desconocido admiten precio ausente/null; permanecen inactivos, no destacados y no comprables.»
- «1.000 caracteres por mensaje, 12 mensajes de historial», «512 tokens de salida», «timeout total 10 segundos», «5 solicitudes por identidad cada 10 minutos» y «1.000 solicitudes» de chat por día, configurables según el diseño.
- «No persistir conversaciones en servidor por defecto»; historial solo en memoria de la pestaña.
- «No se crean cuentas ni recursos remotos durante la implementación local.» Confirmación explícita antes de despliegues, migraciones, seeds o importaciones remotas con escritura; aplicar AGENTS.md.
- «La aplicación final no tendrá fallback operativo a Firestore.» Solo herramientas explícitas de exportación histórica pueden conservar su dependencia.
- Preservar todos los cambios locales anteriores, incluidos archivos no versionados. No crear una implementación desde HEAD omitiéndolos; no copiar secretos, cachés ni datos reales al nuevo checkout.

## Review Focus

1. Un formulario de producto abierto antes de una compra no debe recuperar stock vendido: prueba C2 de edición concurrente e inventario final intacto.
2. Un tamaño/sabor retirado mientras el comprador tiene el carrito abierto debe dar conflicto recuperable, sin cobrar ni consumir stock: pruebas C3 y P5 con revisión cambiada.
3. Dos copias históricas con el mismo ID y diferente contenido deben detener la importación: prueba P6; no gana la última escritura.
4. Un token firmado con otro proyecto, un `kid` rotado o una cuenta desactivada no debe eludir autorización: pruebas P3 criptográficas y D1.
5. Si se agota el tope diario del chat, no debe descontarse el cupo individual ni llamarse al proveedor: prueba O1 concurrente de ambas tablas.

## División y orden de ejecución

El alcance combina tres subsistemas. Se entregan planes separados con contratos compartidos para poder probarlos por bloque; se revisan juntos como un único plan de implementación.

| Bloque | Plan | Entrega comprobable | Depende de |
| --- | --- | --- | --- |
| Plataforma y datos | [P1–P6](2026-10-18-cloudflare-datos-plan.md) | Repositorios D1, Auth conservado, herramientas de migración y E2E local | Diseño aprobado |
| Catálogo y panel | [C1–C5](2026-10-18-catalogo-panel-plan.md) | Carta, precios por presentación, CRUD completo, landing y compra | P1–P6 |
| Opsy Bot | [O1–O3](2026-10-18-opsy-bot-plan.md) | Controles de consumo, API DeepSeek y chat accesible | P1–P6 y contrato C1–C2 |
| Integración | R1 de este documento | Release candidate local y expediente de corte | C1–C5 y O1–O3 |
| Producción | R2 de este documento | Datos y tráfico verificados en Cloudflare | R1 y aprobación remota concreta |

Después de C2, C3–C5 y O1–O3 pueden avanzar en paralelo. Un coordinador conserva la propiedad de archivos compartidos (`package.json`, lockfile, `src/app/layout.tsx`, Header/Footer y tipos); los agentes entregan los cambios necesarios para integrarlos secuencialmente. No modificar simultáneamente esos archivos. Los commits intermedios no se publican por integración automática.

## Convenciones de implementación

- Introducir los contratos nuevos junto a los actuales cuando sea necesario para mantener compilación; cambiar consumidores y retirar el puente en la tarea que activa el contrato. No dejar APIs antiguas ocultas como solución final.
- Cada tarea contiene un ciclo de prueba fallida, implementación mínima y verificación. Los fragmentos `expect` del plan son las afirmaciones que deben quedar dentro de tests con esos nombres; no son programas para ejecutar sin sus fixtures.
- Las pruebas unitarias usan HTTP simulado y fixtures sintéticos. Las pruebas `tests/d1/` usan D1 real local vía Wrangler; nunca un mock de transacciones Firestore renombrado.
- Antes de cada commit: seguridad del cambio, pruebas enfocadas con salida real, diff revisado y sin secretos. Aplicar `self-critique-loop`, `security-baseline` y `verification-before-completion` durante ejecución. No modificar código solo para satisfacer una inspección textual de tests heredados.
- Guardar comandos y resultados reales en `docs/superpowers/reports/2026-10-18-cloudflare-implementation.md` al ejecutar. No anticipar resultados en el plan ni repetir gates sin cambios nuevos que lo justifiquen.
- Preparar aislamiento en ejecución con `using-git-worktrees`, incluyendo un snapshot reversible de modificaciones y archivos no versionados pertinentes; nunca `reset`, `clean` o stash destructivo del trabajo previo. La planificación no crea ese checkout.
- Consultar documentación oficial/metadatos al fijar versiones OpenNext/Wrangler/jose. La compatibilidad de 16.3.8 se prueba; no se presupone. Validar también en Linux/CI porque OpenNext limita soporte Windows.

## R1: Integración y expediente verificable de corte

**Files:** modificar `README.md`, `AGENTS.md`, `STACK.md`, `.env.example`; crear `.github/workflows/cloudflare-validate.yml` (solo validación, sin deploy ni secretos), `src/proxy.ts`, `src/lib/maintenance.ts`, `tests/api/maintenance.test.ts`, `firestore.freeze.rules`, `docs/cloudflare-cutover.md`, `docs/superpowers/reports/2026-10-18-cloudflare-implementation.md` y pruebas E2E de catálogo/chat. Revisar `src/app/api/**`, `src/firebase/**`, `src/lib/**` y scripts operativos para dependencias residuales.

**Interfaces:** consume los tres planes completos; produce artefacto OpenNext probado, matriz de migración/rollback y expediente sin secretos para aprobar destinos remotos.

- [ ] Escribir/terminar escenarios `catalog-admin.spec.ts` y `opsy-chat.spec.ts`: alta con imagen → categoría visible → tamaño correcto → compra → cambio de estado; chat sin clave, éxito y error recuperable. Añadir `maintenance_blocks_mutations_and_preserves_reads`: con flag privado `OPERATIONS_READ_ONLY=true`, `expect(post.status).toBe(503)` para POST/PATCH/DELETE y Server Actions antes de sus handlers, mientras GET/HEAD mantienen su autorización normal. Proveedor HTTP simulado, 375 px y escritorio; incluir teclado, foco, overflow y contraste inspeccionado.
- [ ] Ejecutar `pnpm test:e2e:local` y `pnpm exec vitest run tests/api/maintenance.test.ts`; comprobar RED de mantenimiento antes del proxy, y corregir fallos reales de integración sin apuntar a un servidor existente ni credenciales remotas. Conservar reporte HTML, capturas y trace de fallos dentro de rutas ignoradas.
- [ ] Implementar mantenimiento servidor en `src/proxy.ts` mediante `isOperationsReadOnly(environment: Record<string,string|undefined>): boolean` de `maintenance.ts`; responder 503 con Retry-After a métodos mutantes, sin leer body ni llegar a DB. Preparar el mismo parche mínimo como artefacto de mantenimiento sobre el snapshot inicial compatible con Vercel; probarlo localmente sin cambiar el origen remoto. Preparar reglas de congelación de Firestore para el corte autorizado.
- [ ] Ejecutar los tests de mantenimiento y una vez el gate completo tras integrar: `pnpm test`, `pnpm test:d1`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm cf:build`, `pnpm audit --prod --audit-level high`. Resultado necesario: cero fallos; excepciones de auditoría requieren revisión fundamentada. Repetir solo lo afectado por correcciones y el gate final cuando cambie su entrada.
- [ ] Validar preview con `pnpm cf:preview` en Windows y build/preview equivalente en Linux/CI: login, `/menu`, API protegida, bindings D1/R2, entrega de imágenes y secreto ausente. Registrar duración/consumo de consultas relevantes y peso/carga de landing/chat antes de optimizar. Crear evidencia de ausencia de Firestore normal con `rg -n 'firebase-admin/firestore|firebase/firestore|getAdminDb|@/lib/firestore' src`; salida esperada vacía al finalizar O3.
- [ ] Preparar `docs/cloudflare-cutover.md` con copia verificada, conteos/hashes, pasos de mantenimiento del origen, artefacto compatible de contingencia, revalidación de precios/permisos, límites de chat y ubicaciones de secretos. Campos reales de cuenta, Worker, base, bucket, dominio y retención se completan desde metadatos autorizados al preparar el corte; un expediente incompleto no habilita R2. Commit: `docs: record Cloudflare release validation and cutover procedure`.

**Cierre R1:** todo lo comprobable localmente está resuelto; la aprobación final recibe destinos y evidencia concretos. R1 no afirma que los datos reales estén migrados ni que DeepSeek esté conectado.

## R2: Preview remoto, copia final y cambio de tráfico

**Files:** configuración del entorno elegido, `docs/cloudflare-cutover.md` y reporte de release; sin añadir credenciales a Git.

**Interfaces:** consume artefacto R1 y aprobación de recursos/alcance remoto; produce destino con importación conciliada y tráfico operativo. No ejecutar por la sola aprobación del diseño o del plan.

- [ ] Presentar el expediente R1 para confirmar cuenta, recursos, dominio, escritura remota, presupuesto/plan y alcance preview/producción. Para preview usar recursos aislados y fixture sintético; no confundir su aprobación con el corte de producción. No abrir planes de pago por defecto.
- [ ] Tras aprobación del destino, crear/vincular recursos y cargar `DEEPSEEK_API_KEY` y `CHAT_RATE_LIMIT_SECRET` mediante secretos Cloudflare por entorno. El operador introduce la clave en el gestor; no se imprime. Verificar disponibilidad del modelo con una llamada mínima autorizada y registrar solo estado/modelo/uso agregado. Actualizar dominios autorizados Firebase y comprobar login/verificación/recuperación. Publicar el artefacto de mantenimiento autorizado en el origen Vercel antes de congelarlo; inventariar y bloquear también accesos a despliegues anteriores que conserven capacidad de escritura. Si no se puede demostrar ese bloqueo, no abrir un segundo origen con escrituras.
- [ ] Antes de copiar datos reales: acordar destino privado, acceso y retención de 30 días; respaldar ambas colecciones de pedidos y todas las operativas; comprobar hashes y restauración en entorno aislado. Congelar y probar bloqueo de todas las rutas mutantes Vercel y escrituras Firestore directas antes de la exportación final.
- [ ] Ejecutar importación aprobada y verificación P6; aplicar después el diff comercial Canva revisado, sin reescribir stock ni identidades. Abrir tráfico/escrituras únicamente con igualdad de IDs/totales, permisos e inventario, smoke funcional y contingencia compatible comprobada. Si falla una condición, mantener mantenimiento y resolver; no degradar a un origen alternativo silencioso.
- [ ] Registrar URL, versión, proyecto Auth, base/bucket, conteos, hashes, hora del corte y comprobación de un flujo operativo controlado. Mantener origen bloqueado 30 días. Antes de escrituras D1 puede reabrirse el origen comprobando ausencia de delta; después solo recuperación compatible en Cloudflare con reconciliación. Eliminar Firestore o cerrar Vercel exige otra instrucción explícita. Commit de notas sin datos privados: `docs: record verified Cloudflare cutover`.

## Revisión del plan y elección de ejecución

Este plan tiene 15 tareas de implementación e integración local (P1–P6, C1–C5, O1–O3 y R1), más R2 remoto. Recomendación: ejecución con subagentes por tarea y revisiones independientes en contratos, autorización y transacciones; el coordinador integra los archivos compartidos. Alternativa: ejecución directa por el agente principal y revisión independiente al final, con menor coste de coordinación.

Antes de implementar, el operador revisa estos documentos y elige el método, como exige `writing-plans`. Los checkboxes permanecen vacíos hasta tener evidencia de ejecución. La preparación y revisión documental no ejecutaron pruebas de producto ni cambios remotos.

La revisión propia del plan comprobó cobertura del diseño, secuencia P→C/O→R, consistencia de firmas/DTO, pruebas de los cinco riesgos y proporción del detalle. Se corrigieron la retirada temprana del sugeridor para no romper el build, la importación de cuotas antes de activarlas, los puentes temporales de catálogo y la ausencia de consultas D1 en prerender. No hay tareas marcadas como ejecutadas.
