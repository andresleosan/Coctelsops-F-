# QA local con Firebase Emulator y Playwright

## Estado

Diseño aprobado por el operador el 2026-08-05.

## Objetivo

Cerrar el bloqueo de verificación browser y de reglas Firestore mediante un entorno local reproducible. El bloque debe validar autenticación, autorización, catálogo, checkout, historial de pedidos y operaciones administrativas sin usar Firebase de producción ni credenciales reales.

## Alcance

- Configurar los emuladores locales de Authentication y Firestore.
- Permitir que el SDK web se conecte a los emuladores solo mediante una bandera explícita de entorno.
- Preparar datos efímeros para cliente, staff, administrador, roles, catálogo y configuración.
- Ejecutar la suite Playwright contra una aplicación Next.js local.
- Ejecutar pruebas de reglas Firestore contra el emulador.
- Limpiar usuarios y documentos de prueba únicamente en hosts loopback y con confirmación explícita.
- Documentar requisitos, comandos, variables y límites operativos.

## Fuera de alcance

- No usar credenciales de Firebase de producción.
- No desplegar reglas, índices, seed ni migraciones a Firebase remoto.
- No ejecutar `scripts/migrate-orders.ts` ni `scripts/verify-migration.ts` sobre datos reales.
- No declarar aprobada la verificación responsive visual si no existe una corrida browser con capturas o revisión manual documentada.
- No modificar la lógica de negocio salvo los adaptadores mínimos necesarios para seleccionar emuladores.

## Arquitectura

### Emuladores

Firebase Authentication escuchará en `127.0.0.1:9099` y Firestore en `127.0.0.1:8080`. La configuración se declarará en `firebase.json` junto con el proyecto demo usado por la ejecución local. La UI del emulador podrá habilitarse en un puerto local separado si resulta útil para inspección, pero no será requisito de las pruebas.

### Cliente web

El SDK web conservará la configuración pública proveniente de variables `NEXT_PUBLIC_FIREBASE_*`. Cuando `NEXT_PUBLIC_FIREBASE_EMULATORS=true`, inicializará conexiones explícitas a los emuladores loopback. En cualquier otro valor mantendrá el comportamiento normal y nunca inferirá el uso de emuladores por el nombre del proyecto.

### Servidor

Los clientes Firebase Admin usarán `FIRESTORE_EMULATOR_HOST` y `FIREBASE_AUTH_EMULATOR_HOST` solo en la ejecución local. El setup E2E no leerá archivos `.env.local` ni imprimirá credenciales privadas. Las credenciales de prueba serán efímeras y se mantendrán en un archivo temporal ignorado por Git.

### Datos E2E

Un setup local creará tres identidades de prueba: cliente, staff con permisos limitados y administrador. También creará los roles, perfiles, productos activos, configuración pública y cualquier documento mínimo requerido por checkout y operaciones. El setup será idempotente dentro de una corrida y devolverá los datos de acceso únicamente al proceso de Playwright.

### Playwright

La configuración de Playwright levantará Next.js en `127.0.0.1:9002`, esperará la URL local y ejecutará `tests/e2e/auth-checkout-admin.spec.ts`. Las pruebas conservarán su capacidad de ejecutarse contra una URL externa cuando todas las variables E2E explícitas estén configuradas, pero el flujo local tendrá valores generados en tiempo de ejecución y no dependerá de credenciales versionadas.

### Reglas Firestore

La suite de reglas cargará `firestore.rules` en el emulador y comprobará al menos:

- Cliente que lee y actualiza solo su propio perfil.
- Cliente que no lee perfiles ajenos.
- Cliente que no crea ni modifica pedidos directamente.
- Cliente que lee solo sus propios pedidos.
- Usuario administrativo sin permiso que recibe denegación.
- Administrador con claim estricto que accede a las operaciones permitidas.

## Flujo de ejecución

1. Verificar Firebase CLI, Java y dependencias instaladas.
2. Arrancar Auth y Firestore Emulator en loopback.
3. Preparar identidades y datos de prueba efímeros.
4. Levantar Next.js con la bandera de emuladores activa.
5. Ejecutar las pruebas de reglas y la suite Playwright.
6. Generar el reporte HTML de Playwright y conservarlo como artefacto local no versionado.
7. Limpiar usuarios y documentos de prueba solo si los hosts siguen siendo loopback y la confirmación de limpieza está presente.
8. Detener los emuladores y devolver un código distinto de cero si alguna fase falla.

## Seguridad

- La limpieza requiere `E2E_CLEANUP=true` y `E2E_CLEANUP_CONFIRM=DELETE_E2E_DATA`.
- La limpieza rechaza cualquier host que no sea `localhost` o `127.0.0.1`.
- El setup no contiene contraseñas reales ni valores de producción.
- No se ejecutarán comandos Firebase remotos desde el script local.
- La bandera de emuladores no podrá activarse por defecto en builds normales.
- Los reportes no deben incluir tokens, claves privadas ni respuestas completas con datos sensibles.

## Criterios de aceptación

- `npm test` pasa sin descubrir los tests E2E.
- `npm run typecheck`, `npm run lint` y `npm run build` pasan.
- La suite de reglas se ejecuta contra Firestore Emulator y registra casos permitidos y denegados.
- La suite Playwright local ejecuta los tres escenarios sin `skip` por falta de `E2E_BASE_URL` o credenciales.
- La limpieza se bloquea cuando falta confirmación o el host no es loopback.
- No aparecen archivos de estado, reportes HTML, credenciales ni logs de emulador en Git.
- La documentación permite repetir el flujo desde una instalación limpia sin acceso a producción.

## Riesgos y límites

- Firebase Emulator requiere Java y puede no estar disponible en todos los entornos.
- La prueba local no demuestra que las credenciales, reglas o índices hayan sido desplegados al proyecto remoto correcto.
- La prueba browser local no reemplaza la revisión responsive manual en dispositivos reales.
- Las vulnerabilidades de dependencias existentes se tratarán en un bloque separado y no se corregirán con `npm audit fix --force` dentro de este bloque.
