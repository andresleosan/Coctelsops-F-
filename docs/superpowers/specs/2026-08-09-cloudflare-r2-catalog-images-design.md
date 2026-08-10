# Diseño: imágenes de catálogo con Cloudflare R2

## Objetivo

Sustituir Firebase Storage por Cloudflare R2 únicamente para almacenar y servir
las imágenes del catálogo real de Coctels OPS. Firestore seguirá siendo la fuente
oficial de productos, mientras que Firebase Auth, Vercel, checkout y el panel
administrativo conservarán su comportamiento actual.

Este documento supersede la decisión de Firebase Storage del diseño de catálogo
real. No modifica el resto de ese alcance.

## Alcance aprobado

- Subir imágenes desde el importador y desde el endpoint administrativo a R2.
- Guardar en `productos.image` la URL pública persistible de R2.
- Mantener el prefijo estable `catalog/products/{productId}/` y usar una clave
  versionada por subida para que el rollback nunca borre una imagen anterior.
- Mantener las validaciones existentes de extensión, MIME, bytes, tamaño y rutas.
- Usar la API S3 compatible de R2 desde código exclusivamente del servidor.
- Mantener Firestore, Firebase Auth, Vercel y el checkout sin cambios.
- Usar `r2.dev` solo para pruebas; producción usará un dominio personalizado.

## Alternativas consideradas

1. **R2 mediante API S3 desde el servidor, elegida.** Reutiliza el contrato actual
   del importador y del panel, evita credenciales en el navegador y no cobra
   transferencia de salida.
2. **Cloudflare Images.** Añade transformación y entrega administrada, pero
   introduce otra API y costos innecesarios para cinco imágenes estáticas.
3. **Resolver la cuenta de facturación de Firebase.** Evita cambios de código,
   pero depende de liberar o cambiar la cuenta de facturación bloqueada.

## Arquitectura

- `src/lib/catalog/storage.ts` conservará la interfaz pública usada por el admin.
- Un cliente `server-only` de R2 usará `@aws-sdk/client-s3` con el endpoint
  `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.
- El importador CLI y el endpoint admin compartirán la misma función de subida.
- `R2_PUBLIC_BASE_URL` será la base de las URLs persistidas y permitirá cambiar
  de `r2.dev` a un dominio personalizado sin migrar documentos.
- Firestore seguirá guardando la URL en el campo actual `image`; no habrá
  migración de documentos.
- El cliente web no recibirá `R2_ACCESS_KEY_ID` ni `R2_SECRET_ACCESS_KEY`.

## Flujo de escritura

### Importador

1. `dry-run` valida manifiesto e imágenes locales sin llamar a R2 ni Firestore.
2. `--write` valida todos los registros antes de comenzar escrituras.
3. Para cada producto, sube el objeto con `Content-Type` y política de caché.
4. Actualiza o crea el documento Firestore mediante el `upsert` existente.
5. Registra la auditoría existente con el actor `catalog-import`.

### Reemplazo desde admin

1. Verifica autenticación y permiso `productos.write`.
2. Valida tamaño, extensión, MIME y bytes reales.
3. Sube el nuevo objeto a R2.
4. Actualiza únicamente la imagen y la auditoría del producto.

Si la escritura en Firestore falla después de una subida, el flujo intentará
eliminar el objeto recién creado. Si esa limpieza también falla, se registrará
la clave del objeto sin exponer credenciales para permitir limpieza manual.
Una falla de R2 nunca debe escribir Firestore.

Las repeticiones generan una nueva clave versionada y no eliminan productos ni
imágenes anteriores automáticamente. Esto permite que el rollback borre solo el
objeto creado por la operación que falló.

## Seguridad y configuración

Variables privadas requeridas:

```text
R2_ACCOUNT_ID
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PUBLIC_BASE_URL
```

- El token de Cloudflare tendrá únicamente permisos de lectura/escritura sobre
  el bucket del catálogo.
- Las variables se configurarán en el entorno local y en Vercel Production.
- No se guardarán secretos en Git, logs, respuestas HTTP ni variables públicas.
- El SDK usará reintentos limitados, máximo tres intentos, sin bucles propios.
- El bucket usará la clase Standard.
- R2 ofrece 10 GB-mes, 1 millón de operaciones Class A, 10 millones Class B y
  egress gratuito por mes sin costo; el excedente se factura según el tarifario
  vigente de Cloudflare. Esta cuota no es un límite de gasto duro.

## Pruebas y criterios de aceptación

- `npm run catalog:import -- --dry-run` reporta cinco productos, cero errores y
  no realiza llamadas a R2.
- La importación real sube cinco imágenes, crea o actualiza cinco productos y
  no reporta errores.
- Las URLs persistidas pertenecen a `R2_PUBLIC_BASE_URL` y no a Firebase Storage.
- Un administrador autorizado puede reemplazar una imagen desde el panel.
- Se prueban subida correcta, rechazo de imágenes inválidas, error de R2,
  limpieza tras error de Firestore y ausencia de escrituras en `dry-run`.
- Pasan tests, typecheck, lint, build y el smoke funcional del catálogo/admin.

## Dependencia operativa

Antes de la prueba remota, el operador debe crear el bucket R2, generar un token
restringido y configurar las cinco variables en el entorno correspondiente. Las
credenciales no deben pegarse en el chat.

## Fuera de alcance

- Migrar Firestore, Auth, checkout o Vercel a Cloudflare.
- Usar Cloudflare Images o Workers para esta primera versión.
- Sincronizar Canva con la aplicación.
- Borrar automáticamente objetos antiguos o productos ausentes.
