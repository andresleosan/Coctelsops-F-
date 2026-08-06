# Actualizacion a Next 16

> **Para agentes:** ejecutar esta lista en orden y conservar evidencia de cada comando antes de integrar en `main`.

**Objetivo:** Actualizar Next.js y su configuración ESLint a la versión 16 autorizada, resolver incompatibilidades del proyecto y publicar los cambios verificados en `main`.

**Arquitectura:** Se mantiene el App Router existente y no se cambian rutas, contratos de API ni el modelo de Firebase. La actualización se limita al framework, su configuración de lint y el lockfile, además de los ajustes de compatibilidad estrictamente necesarios.

**Stack:** Next.js 16.3.0, React 19, TypeScript, ESLint, Firebase Emulator Suite, Vitest y Playwright.

## Restricciones

- No ejecutar `npm audit fix --force`.
- No modificar secretos, credenciales ni configuración remota.
- No desplegar ni ejecutar migraciones de producción.
- Mantener la prueba responsive en `tests/e2e/responsive.spec.ts`.
- Crear commit y hacer push solo después de que pasen los gates de verificación.

## Tareas

### Tarea 1: Actualizar dependencias

**Archivos:**
- Modificar: `package.json`
- Modificar: `package-lock.json`

- [x] Ejecutar `npm install eslint@^9.0.0 next@16.3.0 eslint-config-next@16.3.0 --save-exact` para satisfacer el peer de ESLint 9.
- [x] Revisar warnings de migración y el árbol con `npm ls next eslint-config-next postcss sharp`.

### Tarea 2: Resolver compatibilidad

**Archivos:**
- Modificar: únicamente archivos que el build o las pruebas identifiquen como incompatibles.

- [x] Ejecutar `npm run typecheck` y corregir solo errores causados por Next 16.
- [x] Ejecutar `npm run lint` y corregir solo incompatibilidades de la configuración actual.

### Tarea 3: Verificación completa

**Archivos:**
- Verificar: `tests/e2e/responsive.spec.ts`, `package.json`, `package-lock.json`.

- [x] Ejecutar `npm test`.
- [x] Ejecutar `npm run test:firestore-rules`.
- [x] Ejecutar `npm run test:e2e:local`.
- [x] Ejecutar `npm run build`.
- [x] Ejecutar `npm audit --omit=dev --audit-level=high` y documentar cualquier vulnerabilidad sin fix compatible.
- [x] Ejecutar `git diff --check`.

### Tarea 4: Integrar

- [ ] Revisar `git status`, `git diff` y `git log --oneline -10`.
- [ ] Crear un commit conciso con todos los cambios intencionados.
- [ ] Hacer push de `main` a `origin`.
- [ ] Verificar que el push terminó correctamente y reportar el commit publicado.
