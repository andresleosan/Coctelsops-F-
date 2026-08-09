# Coctels OPS

Coctels OPS es una tienda mobile-first de cócteles y un panel operativo construido con Next.js, Firebase Auth y Firestore. La interfaz pública conserva el flujo de confirmación preparado para WhatsApp; no incluye pagos ni envío automático por la API oficial de WhatsApp.

## Requisitos

- Node.js compatible con Next.js 16 y npm.
- Firebase CLI para publicar reglas e índices y ejecutar emuladores locales.
- Java 11 o superior para Firebase Emulator Suite.
- Un proyecto Firebase separado para desarrollo, staging o producción.
- Credenciales de Firebase Admin entregadas por un operador autorizado únicamente mediante variables de entorno.

## Configuración local

1. Instala dependencias: `npm install`.
2. Verifica las herramientas locales: `firebase --version` y `java -version`. Si falta Firebase CLI, instálalo con `npm install --global firebase-tools`; Java 11 o superior es requisito de Firebase Emulator Suite.
3. Copia `.env.example` a `.env.local` y reemplaza todos los valores de ejemplo con la configuración de tu proyecto. No subas `.env.local`.
4. En Firebase Console habilita Authentication con estos proveedores:
   - Email/Password.
   - Google, con los dominios autorizados configurados.
   - Verificación de correo y recuperación de contraseña mediante las plantillas de correo de Firebase.
5. Publica reglas e índices desde el directorio raíz, después de revisar el proyecto seleccionado:
   ```powershell
   firebase login
   firebase projects:list
   firebase deploy --project "$env:FIREBASE_PROJECT_ID" --only firestore:rules,firestore:indexes
   ```
6. Inicia el servidor: `npm run dev`. La aplicación queda en `http://localhost:9002`.

`firebase.json` referencia `firestore.rules` y `firestore.indexes.json`, configura los emuladores locales y no contiene secretos. El flujo oficial de QA local usa los runners descritos abajo, selecciona puertos loopback dinámicos y crea configuración temporal; no requiere un proyecto Firebase remoto.

## QA local con Firebase Emulator Suite

Ejecuta primero `npm install`, `firebase --version` y `java -version`. Java 11 o superior es requisito del Emulator Suite.

```powershell
npm run test:firestore-rules
npm run test:e2e:local
```

`npm run test:firestore-rules` inicia solo Firestore Emulator, carga las reglas e índices del repositorio y valida cinco casos reales de autorización para cliente, staff y admin. Usa fixtures namespaced, elimina únicamente sus documentos y borra la configuración temporal al finalizar.

`npm run test:e2e:local` inicia Auth y Firestore Emulator en puertos loopback libres, prepara estado y credenciales efímeras, ejecuta los tres escenarios browser locales y ejecuta cleanup aunque haya fallos. El reporte HTML queda en `qa/reports`, los resultados/screenshot/traces en `qa/test-results` y el estado/configuración efímeros en `.tmp/e2e`.

El runner establece únicamente variables locales como `FIREBASE_EMULATORS=true`, `NEXT_PUBLIC_FIREBASE_EMULATORS=true`, `FIREBASE_PROJECT_ID=demo-coctels-e2e`, hosts `127.0.0.1:<puerto>`, `E2E_CLEANUP=true` y `E2E_CLEANUP_CONFIRM=DELETE_E2E_DATA`. No uses credenciales reales. No ejecutes `firebase deploy`, seed ni migraciones desde este flujo; las operaciones remotas necesitan backup y aprobación explícita del operador.

## Variables de entorno

`.env.example` lista estas variables públicas como contrato de configuración del cliente; no sustituyen las reglas de Firebase:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_WHATSAPP_PHONE`

Las variables privadas son obligatorias para las rutas protegidas y los scripts administrativos:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`, con `\n` escapados si se entrega en una sola línea.

Nunca pongas una clave privada, un token de servicio o una contraseña en `README.md`, tests, `src/firebase/config.ts` ni en el repositorio. Los valores de `.env.example` son placeholders. Antes de desplegar, verifica que la configuración pública del cliente y el proyecto usado por Firebase Admin sean el mismo proyecto.

Nota: el bootstrap actual del cliente importa `src/firebase/config.ts` directamente. Antes de usar otro proyecto Firebase, verifica y actualiza esa configuración pública mediante el mecanismo de despliegue aprobado; no asumas que definir `NEXT_PUBLIC_*` cambia por sí solo el proyecto del navegador.

## Primer administrador y catálogo

1. Registra el usuario en Firebase Auth y copia su UID desde Firebase Console.
2. Con las variables privadas cargadas, ejecuta `npx tsx scripts/set-admin.ts <UID>`.
3. Comprueba que el claim se haya renovado cerrando sesión y entrando de nuevo.
4. Si el catálogo todavía no existe en Firestore, ejecuta `npx tsx scripts/seed-catalog.ts`. El script escribe IDs estables y es idempotente.

El bootstrap de administrador y la siembra del catálogo requieren acceso real al proyecto Firebase. No se ejecutan como parte de `npm test`, `npm run build` ni durante el arranque de Next.js.

## Migración de pedidos heredados

La migración copia `orders/{id}` a `pedidos/{id}`, conserva los documentos fuente y omite los destinos ya migrados. Antes de tocar un proyecto compartido o producción son obligatorios un backup verificable, credenciales configuradas, una ventana operativa y aprobación explícita del operador:

```powershell
npx tsx scripts/migrate-orders.ts
npx tsx scripts/verify-migration.ts
```

No ejecutes esos comandos contra producción sin completar esas condiciones. La aplicación no elimina automáticamente la colección heredada `orders`.

## Verificación

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run test:firestore-rules
npm run test:e2e:local
```

Los tests de Vitest excluyen `tests/e2e/**`. `npm run test:e2e` sigue siendo la suite externa y requiere una aplicación levantada, navegadores instalados y variables de prueba; `npm run test:e2e:local` es la vía reproducible contra emuladores locales y no necesita proyecto remoto. No uses credenciales reales en archivos de test ni reportes.

La limpieza de datos temporales solo funciona contra emuladores locales: el runner define `E2E_CLEANUP=true`, `E2E_CLEANUP_CONFIRM=DELETE_E2E_DATA` y hosts loopback dinámicos. El hook exige ambos hosts, rechaza cualquier host que no sea `localhost` o `127.0.0.1` y falla cerrado antes de borrar si falta alguna variable. Elimina únicamente los pedidos y usuarios generados en la ejecución emulada. Sin hosts loopback y confirmación explícita no borra nada; no puede apuntar a producción ni a un proyecto Firebase remoto.

El reporte de release con resultados, riesgos y limitaciones está en `docs/superpowers/reports/2026-08-04-auth-clientes-admin.md`.

## Rutas principales

- Tienda: `/menu`.
- Login y registro: `/login`, `/registro`.
- Cuenta e historial: `/cuenta`, `/cuenta/perfil`, `/cuenta/pedidos`.
- Checkout autenticado: `/checkout`.
- Panel operativo: `/admin/login` y `/admin/dashboard`.
