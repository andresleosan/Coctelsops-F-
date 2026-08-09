# Diseño: catálogo real con edición administrativa

## Objetivo

Reemplazar los productos de ejemplo por los productos reales de la carta Coctels OPS. La carga inicial será única; después de importarlos, Firestore será la fuente oficial y el panel administrativo permitirá mantener el catálogo.

## Alcance aprobado

- Importar productos reales a la colección `productos`.
- Subir las imágenes locales a Firebase Storage y guardar sus URLs en cada producto.
- Mantener editables desde el panel: nombre, descripción, precio, categoría, imagen, sabores, adiciones, stock, estado activo y destacado.
- Hacer que el carrusel y el catálogo público consuman la misma fuente Firestore.
- Mostrar un fallback visual controlado cuando un producto no tenga imagen válida; no usar fotos aleatorias.

## Fuente de verdad

Canva se utilizará únicamente como referencia para la carga inicial. No se implementará sincronización automática porque la página publicada no expone un contrato estructurado estable para productos.

Después de la importación, Firestore será la fuente oficial. Los cambios realizados en Canva no modificarán la aplicación automáticamente.

## Flujo de importación

1. Preparar un archivo de entrada validado con los productos reales y sus campos comerciales.
2. Asociar cada producto con una imagen local.
3. Ejecutar una validación previa que reporte errores sin escribir datos.
4. Subir imágenes a Firebase Storage.
5. Crear o actualizar documentos mediante `upsert` usando IDs estables.
6. No eliminar documentos existentes automáticamente.
7. Registrar `createdAt`, `updatedAt` y una auditoría por cada cambio.
8. Verificar catálogo público, checkout y panel admin antes de publicar cambios.

## Imágenes

Las imágenes no se tomarán de URLs temporales de Canva ni de hosts aleatorios. El flujo definitivo será:

- archivo local -> Firebase Storage -> URL persistida en `productos.image`;
- edición administrativa -> reemplazo opcional del archivo y actualización de la URL;
- eliminación o reemplazo -> conservar el archivo anterior durante la validación para permitir rollback manual.

El carrusel no mantendrá rutas hardcodeadas como `/Fresa.png`; leerá productos destacados y sus imágenes desde la misma fuente que usa el catálogo.

## Seguridad y reversibilidad

- La importación requiere credenciales Admin solo en variables locales seguras o en el entorno aprobado; nunca en Git.
- El script será idempotente y no ejecutará borrados.
- La escritura remota se hará solo después de una validación explícita del operador.
- Las reglas de autorización existentes para `productos.read` y `productos.write` seguirán aplicando al panel.
- Cada operación de creación o actualización usará la auditoría existente.

## Criterios de aceptación

- Todos los productos reales visibles en la carta están representados en Firestore.
- El catálogo público muestra nombre, precio, descripción e imagen correctos.
- El carrusel no solicita archivos locales inexistentes.
- Un administrador autorizado puede crear, editar, activar, desactivar y destacar productos.
- Un administrador autorizado puede reemplazar la imagen sin editar código.
- Un cambio de precio o disponibilidad desde admin se refleja en el catálogo público.
- La importación puede repetirse sin duplicar ni borrar productos.
- Tests unitarios, typecheck, lint, build y smoke funcional pasan antes de publicar.

## Fuera de alcance

- Sincronización Canva -> aplicación.
- Importación automática desde el HTML publicado de Canva.
- Edición de la carta dentro de Canva desde el panel admin.
- Borrado automático de productos que ya no aparezcan en la carta.

## Dependencia operativa

La implementación de la carga real queda pendiente de disponer de las imágenes locales y de la lista final de productos, precios y opciones comerciales.
