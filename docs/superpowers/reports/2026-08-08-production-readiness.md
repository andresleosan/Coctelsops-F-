# Readiness de Producción

Fecha: 2026-08-08
Rama verificada: `main`
Commit remoto: `171c3be`

## Diagnóstico

`https://coctelsops-f.vercel.app/` responde `404 DEPLOYMENT_NOT_FOUND` con el mensaje de Vercel `The deployment could not be found on Vercel.` La solicitud no llega a Next.js, Firebase ni a las rutas de la aplicación; el bloqueo está en el proyecto o dominio de Vercel.

El repositorio no contiene `vercel.json` ni metadata `.vercel/`. Eso es válido para un proyecto Next.js autodetectado, pero significa que la vinculación del repositorio, el proyecto Vercel y el dominio deben existir en Vercel.

## Gates Locales

- `npm test`: 203 aprobados, 4 skips preexistentes.
- `npm run test:firestore-rules`: 5/5 aprobados.
- `npm run test:e2e:local`: 5/5 aprobados, incluyendo responsive móvil/desktop.
- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npm run build`: aprobado con Next.js 16.3.0 y Webpack explícito.
- `npm audit --omit=dev --audit-level=high`: 59 vulnerabilidades, 7 high transitivas sin fix no disruptiva.

## Checklist Operativo

1. En Vercel, importar `andresleosan/Coctelsops-F-` y seleccionar `main` como production branch.
2. Confirmar que el Root Directory sea la raíz del repositorio, donde viven `package.json` y `next.config.ts`.
3. Configurar las variables públicas `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` y `NEXT_PUBLIC_WHATSAPP_PHONE`.
4. Configurar las variables privadas `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` con valores del mismo proyecto Firebase.
5. Verificar que `FIREBASE_EMULATORS` y `NEXT_PUBLIC_FIREBASE_EMULATORS` no estén activas en Production.
6. Asociar `coctelsops-f.vercel.app` al proyecto correcto o confirmar el nuevo dominio oficial.
7. Ejecutar un deployment de producción desde `main` y verificar `/`, `/login`, `/menu` y `/admin/login`.

## Rollback

Si el deployment falla, conservar la deployment anterior válida en Vercel y revertir el commit de release en `main`; no modificar Firebase ni migrar datos como parte de este diagnóstico. No se ejecutó ningún despliegue remoto desde este entorno.

## Estado

`BLOQUEADO_OPERATIVO`: el código local está validado, pero falta acceso/configuración del proyecto Vercel. No se puede afirmar que producción esté reparada hasta que el dominio devuelva una respuesta de la aplicación.
