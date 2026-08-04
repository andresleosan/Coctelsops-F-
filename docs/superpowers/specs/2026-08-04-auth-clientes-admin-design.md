# Coctels OPS: autenticacion, clientes y administracion

## Estado

Diseno aprobado por el usuario el 2026-08-04.

## Objetivo

Evolucionar Coctels OPS hacia una aplicacion con clientes y administradores autenticados, tomando como referencia estructural Mundo Celular sin copiar su diseno visual. La tienda conservara su identidad neón mobile-first y el panel mantendra una experiencia coherente con Coctels OPS.

El pago continuara gestionandose mediante confirmacion por WhatsApp, sin integrar un gateway de pagos en esta fase.

## Decisiones confirmadas

- Arquitectura: monolito modular sobre el proyecto Next.js actual.
- Acceso: Google, correo/contraseña, verificacion de email y recuperacion de contraseña.
- Compra: login obligatorio; no se permiten compras como invitado.
- Roles: configurables por modulo y accion.
- Clientes: perfil, direcciones, historial y detalle de pedidos.
- Administracion: pedidos, catalogo, clientes, usuarios, roles, inventario, promociones, reportes, configuracion, auditoria y notificaciones.
- Pago: confirmacion por WhatsApp, sin API oficial de WhatsApp ni gateway en esta etapa.
- Seguridad: Firebase Admin para APIs y operaciones sensibles; Firebase Auth para identidad.

## Arquitectura

La aplicacion seguira siendo un solo proyecto Next.js con limites claros entre presentacion, dominio y acceso a datos.

```text
src/
  app/
    (storefront)/              # Inicio, menu y paginas publicas
    cuenta/                    # Perfil, direcciones e historial del cliente
    checkout/                  # Checkout autenticado
    admin/
      login/
      dashboard/
      pedidos/
      productos/
      categorias/
      clientes/
      usuarios/
      roles/
      inventario/
      promociones/
      reportes/
      configuracion/
      auditoria/
      notificaciones/
    api/
      auth/
      pedidos/
      admin/
  components/
    auth/
    layout/
    storefront/
    account/
    admin/
  context/
    cart-context.tsx
    auth-context.tsx
  hooks/
  lib/
    auth/
    firestore/
    validation/
    reports/
  types/
```

Responsabilidades:

- Las paginas componen pantallas y navegacion.
- Los componentes gestionan interfaz y estados de interaccion.
- `lib/firestore` encapsula consultas y operaciones de dominio.
- Las rutas API autentican, autorizan y validan entradas.
- Firebase Admin solo se ejecuta en servidor.
- El checkout no escribira pedidos directamente desde el navegador.

## Autenticacion y autorizacion

### Autenticacion

- Firebase Auth habilitara Google y correo/contraseña.
- El registro por correo exigira verificacion de email.
- Se habilitaran recuperacion y cambio de contraseña.
- Google podra acceder directamente cuando Firebase reporte el correo verificado.
- La compra exigira usuario autenticado y email verificado.
- La sesion se sincronizara con un `AuthProvider` basado en cambios de token.

### Usuarios

`users/{uid}` almacenara el perfil de aplicacion:

- `uid`, `email`, `displayName` y `photoURL`.
- `telefono` y direcciones guardadas.
- Estado activo/inactivo.
- Fecha de creacion y ultimo acceso.
- Tipo de cuenta y referencias a roles.

Los pedidos conservaran `clienteUid` y una copia historica de los datos usados durante la compra. El cliente solo podra consultar y modificar sus propios datos.

### Roles y permisos

`roles/{roleId}` tendra nombre, descripcion, estado y permisos por modulo/accion. Ejemplos:

- `pedidos.read`
- `pedidos.update`
- `productos.write`
- `usuarios.manage`
- `reportes.read`

El servidor validara usuario activo, rol y permiso requerido. Los custom claims identificaran el acceso administrativo basico; los permisos detallados se resolveran contra los roles en servidor para permitir cambios sin depender de un token viejo.

Ningun usuario podra elevar sus propios permisos desde el cliente. El primer administrador se creara mediante un mecanismo de bootstrap seguro fuera de la interfaz publica.

`AdminGuard` protegera la experiencia de navegacion, pero la seguridad real estara en las APIs y reglas de Firestore.

## Navegacion

### Cliente

- `/login`: inicio de sesion.
- `/registro`: creacion de cuenta.
- `/recuperar-acceso`: recuperacion de contraseña.
- `/cuenta`: resumen del perfil.
- `/cuenta/perfil`: datos personales, telefono y direcciones.
- `/cuenta/pedidos`: historial y filtros.
- `/cuenta/pedidos/[id]`: detalle, estado y enlace de confirmacion por WhatsApp.
- `/menu`, `/cart` y `/checkout`: flujo de compra existente adaptado a autenticacion.

Si un visitante intenta comprar sin sesion, se redirigira al login y volvera al checkout despues de autenticarse.

### Administracion

- `/admin/login`
- `/admin/dashboard`
- `/admin/pedidos` y `/admin/pedidos/[id]`
- `/admin/productos`
- `/admin/categorias`
- `/admin/inventario`
- `/admin/clientes`
- `/admin/usuarios`
- `/admin/roles`
- `/admin/promociones`
- `/admin/reportes`
- `/admin/configuracion`
- `/admin/auditoria`
- `/admin/notificaciones`

El shell administrativo tendra sidebar responsive, breadcrumbs, busqueda, estados de carga, errores recuperables y confirmaciones para acciones destructivas. Los modulos y acciones no permitidos no se mostraran o quedaran bloqueados segun el permiso.

## Modelo de datos

Colecciones previstas:

- `users`: perfiles de clientes, staff y administradores.
- `roles`: roles y permisos configurables.
- `pedidos`: cliente, items congelados, total, entrega, estado y trazabilidad.
- `productos`: nombre, precio, stock, disponibilidad, imagen, categoria y estado.
- `categorias`: organizacion del menu.
- `inventario_movimientos`: entradas, salidas, ajustes y motivo.
- `promociones`: descuento, vigencia, productos aplicables, limites y activacion.
- `configuracion`: datos del negocio, WhatsApp, horarios, zonas y mensajes.
- `notificaciones`: avisos para cliente y administracion.
- `auditoria`: actor, accion, modulo, entidad, cambios y fecha.

## Flujo de pedidos

1. El cliente inicia sesion y verifica su email.
2. Agrega productos al carrito.
3. `POST /api/pedidos` vuelve a consultar precios, disponibilidad y promociones.
4. La API crea el pedido en estado `pendiente`.
5. La aplicacion genera un mensaje de confirmacion para WhatsApp.
6. El administrador actualiza el pedido mediante estados controlados:
   `pendiente -> confirmado -> preparando -> en_camino -> entregado`.
7. El pedido puede pasar a `cancelado` desde estados validos, con motivo y actor.
8. El cliente consulta estado, detalle y fecha estimada desde su cuenta.

El stock y las promociones se validaran en servidor. Todo ajuste de inventario exigira motivo y generara auditoria. Las notificaciones seran internas; WhatsApp se abrira con un mensaje preparado, sin automatizacion por API en esta fase.

## Seguridad y validacion

- Cada API protegida verificara el ID token con Firebase Admin.
- Cada accion administrativa comprobara usuario activo, rol y permiso.
- Firestore bloqueara escrituras directas no autorizadas.
- Las entradas se validaran con esquemas Zod.
- El servidor recalculara totales, promociones y disponibilidad.
- Las credenciales solo viviran en variables de entorno.
- Firebase Auth aplicara sus protecciones nativas contra intentos repetidos; las APIs rechazaran solicitudes sin token valido y repetiran las validaciones de identidad, permisos y datos en cada llamada.
- No se almacenaran contraseñas ni secretos en Firestore.
- Cambios de roles, permisos, clientes, inventario y configuracion generaran auditoria.

## Migracion desde el estado actual

- Mantener el catalogo actual como fuente inicial.
- Convertir `orders` al modelo `pedidos` conservando historicos.
- Mapear `Pendiente`, `Preparando`, `En Camino` y `Entregado` al nuevo flujo.
- Los pedidos antiguos sin `clienteUid` quedaran identificados como historicos.
- Crear perfiles de usuario al registrarse o iniciar sesion.
- Reemplazar la escritura directa del checkout por la API protegida.
- Implementar autenticacion y autorizacion antes de habilitar administracion avanzada.
- No versionar credenciales Firebase reales; la configuracion seguira usando variables de entorno.

## Verificacion y criterios de exito

Se verificara con TypeScript, lint, build, pruebas de validacion, pruebas de APIs y pruebas de reglas Firestore. Tambien se revisaran los flujos principales en desktop y mobile.

El trabajo se considerara funcional cuando:

- Un cliente pueda registrarse, verificar email, iniciar sesion, recuperar acceso y cerrar sesion.
- Un cliente autenticado pueda comprar, consultar sus pedidos y actualizar su perfil.
- Un cliente no pueda leer pedidos o perfiles ajenos.
- Un administrador pueda gestionar usuarios, roles y permisos.
- Cada permiso limite realmente las acciones de API y Firestore.
- El panel pueda gestionar pedidos, catalogo, inventario, promociones, reportes, configuracion, auditoria y notificaciones.
- Ningun pedido se cree sin validacion de usuario, precios, stock y datos de entrega.
- Los pedidos historicos sigan disponibles despues de la migracion.

## Fuera de alcance inicial

- Gateway de pagos.
- API oficial de WhatsApp o envio automatico de mensajes.
- Separacion en dos aplicaciones o microservicios.
- Copia del diseno visual de Mundo Celular.
