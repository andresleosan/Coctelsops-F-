# Instrucciones del repositorio

## Comandos

- Instalar dependencias: `npm install`.
- Desarrollo: `npm run dev`; inicia Next.js en `http://localhost:9002` con Turbopack.
- Desarrollo de Genkit: `npm run genkit:dev`; para recarga automática usar `npm run genkit:watch`.
- Producción: `npm run build` y luego `npm start`.
- Verificar tipos: `npm run typecheck`.
- Lint: `npm run lint`.
- No hay scripts de pruebas automatizadas definidos en `package.json` ni archivos `*.test.*` o `*.spec.*` en `src/`.

## Estructura

- `src/app/` contiene las rutas App Router: inicio, menú, carrito, checkout, sugerencias de IA, administración y estado de pedido.
- `src/components/layout/` contiene `Header` y `Footer`; `src/components/products/` contiene componentes de productos; `src/components/ui/` contiene primitives basados en Radix.
- `src/context/cart-context.tsx` mantiene el estado global del carrito y se monta desde `src/app/layout.tsx`.
- `src/app/lib/products.ts` es el catálogo estático actual y define el tipo `Product`.
- `src/firebase/` encapsula la inicialización y hooks de Firebase/Firestore/Auth.
- `src/ai/` contiene la configuración de Genkit y los flows server-side; `src/ai/flows/ai-flavor-suggester.ts` es el flow de sugerencias de sabores.
- El alias TypeScript `@/*` apunta a `src/*`.

## Integraciones y configuración

- La configuración Firebase está en `src/firebase/config.ts` y actualmente usa valores placeholder; no reemplazarla con secretos reales versionados.
- Genkit usa el plugin Google AI y el modelo `googleai/gemini-2.5-flash`; los flows pueden requerir credenciales de Google AI configuradas en el entorno.
- Las rutas de imágenes externas permitidas por Next.js están declaradas en `next.config.ts`; agregar nuevos hosts allí antes de usarlos con `next/image`.
- `next.config.ts` tiene `typescript.ignoreBuildErrors` y `eslint.ignoreDuringBuilds` activados. Por eso `npm run build` no sustituye a ejecutar explícitamente `npm run typecheck` y `npm run lint`.
- `apphosting.yaml` configura Firebase App Hosting con `maxInstances: 1`; no asumir que cambiar código despliega automáticamente.
- `opencode.json` define el agente local y Playwright MCP está deshabilitado (`enabled: false`).

## Convenciones de cambio

- Mantener la interfaz en español y la experiencia mobile-first descrita en `README.md`.
- Mantener los límites actuales: páginas y layouts en `src/app/`, UI reutilizable en `src/components/`, estado compartido en `src/context/`, integraciones en sus módulos dedicados.
- Después de cambios de código, ejecutar como mínimo `npm run typecheck`; para cambios de UI o configuración, ejecutar también `npm run lint` y `npm run build` cuando sea posible.
