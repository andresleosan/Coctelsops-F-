# Parches de seguridad — 27 de octubre de 2026

Este cambio parte del HEAD de NPM y conserva las APIs de la aplicación. Actualiza Next/React/sharp y dependencias transitivas afectadas; conserva `@hookform/resolvers` y `patch-package`.

Se retiran `genkit-cli` y los comandos `genkit:dev`/`genkit:watch`: el CLI incorpora `extract-zip@2.0.1`, afectado por [GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) y [GHSA-7pqw-9j4j-h8q3](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3), sin versión corregida upstream. Es tooling de desarrollo sin imports en la aplicación. El runtime de Genkit se conserva; no se añade una descarga alternativa del mismo CLI.

Genkit 1.43 todavía consume Zod 3 y OpenTelemetry 1/SDK 0.52. Google Cloud usa el constructor `Resource` de OpenTelemetry 1. Se conservan esos contratos mediante parches reproducibles aplicados por `patch-package --error-on-fail` en `postinstall`:

- Zod 3.25.28: rechazar arrays con `max`/`length` excedido y sets con `max`/`size` excedido antes de recorrer sus elementos, en CJS y ESM. Adaptación del principio de la [corrección upstream](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd). La API v3 no dispone de límites para Map; los exports beta v4 incluidos en ese paquete quedan fuera de esta certificación. Los consumidores de Zod 4 usan la versión upstream corregida.
- OpenTelemetry core 1.25.1 y 1.30.1: acotar baggage antes de join/split/decodificación a 8192 unidades de texto y 180 cabeceras; descartar valores no textuales o excesivos. Se parchean los tres builds JS distribuidos de cada copia instalada.
- Jaeger y siete instrumentaciones de bases de datos se actualizan a versiones corregidas, conservando el SDK existente.

Usar `npm ci`, `npm run test:security`, `npm test`, `npm run typecheck`, `npm run lint` y `npm run build`. Las pruebas de seguridad inspeccionan el árbol instalado con `npm ls --all --long --json`, comprueban límites y entradas ordinarias, el SDK real, el constructor `Resource`, el registro/cierre de instrumentaciones y un flujo determinista de Genkit sin plugins, modelos ni exportadores de red. Las pruebas de esquemas ejercitan los límites existentes de direcciones y catálogo.

`npm audit --json` incluye desarrollo y sigue avisando por las versiones originales de Zod 3/core 1; los avisos no se suprimen ni se declara una auditoría de cero vulnerabilidades. Los parches deben retirarse cuando sus consumidores permitan una migración comprobada a las versiones upstream corregidas. La compilación tiene un bloqueo previo de permisos de Firestore durante el prerender de `/`, reproducido con el HEAD limpio; no se relajan permisos ni se despliega.
