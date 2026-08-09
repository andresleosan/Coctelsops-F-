# Readiness de Producción

Fecha: 2026-08-08
Rama verificada: `main`
Commit remoto: `171c3be`

## Diagnóstico

`https://coctelsops-f.vercel.app/` responde `404 DEPLOYMENT_NOT_FOUND` con el mensaje de Vercel `The deployment could not be found on Vercel.` El proyecto correcto existe y sirve en `https://coctelsops.vercel.app/`; la URL con sufijo `-f` es un dominio antiguo/no asignado.

El deployment de producción más reciente está en estado `Ready` y la página `/login` responde correctamente. Sin embargo, `/api/configuration` responde `500`.

El repositorio no contiene `vercel.json` ni metadata `.vercel/`. Eso es válido para un proyecto Next.js autodetectado. Vercel confirma el proyecto `coctelsops-f`, framework Next.js, Root Directory `.`, Node.js `24.x` y ningún dominio personalizado.

Vercel también confirma que no hay variables de entorno configuradas para Production. Esta es la causa del `500` en endpoints que inicializan Firebase Admin; no se deben inferir ni sustituir por valores demo.

## Gates Locales

- `npm test`: 203 aprobados, 4 skips preexistentes.
- `npm run test:firestore-rules`: 5/5 aprobados.
- `npm run test:e2e:local`: 5/5 aprobados, incluyendo responsive móvil/desktop.
- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npm run build`: aprobado con Next.js 16.3.0 y Webpack explícito.
- `npm audit --omit=dev --audit-level=high`: 59 vulnerabilidades, 7 high transitivas sin fix no disruptiva.

## Checklist Operativo

1. En Vercel, mantener `andresleosan/Coctelsops-F-` y `main` como production branch.
2. Mantener Root Directory `.` donde viven `package.json` y `next.config.ts`.
3. Configurar las variables públicas `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` y `NEXT_PUBLIC_WHATSAPP_PHONE`.
4. Configurar las variables privadas `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` con valores del mismo proyecto Firebase.
5. Verificar que `FIREBASE_EMULATORS` y `NEXT_PUBLIC_FIREBASE_EMULATORS` no estén activas en Production.
6. Usar `https://coctelsops.vercel.app/` como URL actual o asociar explícitamente un dominio alternativo.
7. Tras configurar variables, ejecutar un deployment de producción desde `main` y verificar `/`, `/login`, `/menu`, `/admin/login` y `/api/configuration`.

## Rollback

Si el deployment falla, conservar la deployment anterior válida en Vercel y revertir el commit de release en `main`; no modificar Firebase ni migrar datos como parte de este diagnóstico. No se ejecutó ningún despliegue remoto desde este entorno.

## Estado

`BLOQUEADO_OPERATIVO`: el deployment existe y la UI pública carga, pero Production no tiene variables Firebase y `/api/configuration` devuelve `500`. Falta configurar secretos en Vercel; no se puede completar ese paso desde el repositorio sin exponer credenciales.
