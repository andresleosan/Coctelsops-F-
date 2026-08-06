# Task 2 - Reporte: datos E2E efimeros para Firebase Emulator

## Estado

**DONE_WITH_CONCERNS**

La implementacion queda limitada a Firebase Emulator con hosts loopback. No se usaron credenciales reales, no se hizo deploy remoto, no se ejecutaron migraciones y no se hizo push.

## Commits

- `67ccf83` - `fix: restringir rollback y cleanup E2E`
- `4e17129` - `test: preparar datos efimeros para E2E local`
- `64a2cfd` - `fix: cerrar cleanup y rollback E2E local`

El reporte y los archivos de contexto bajo `.superpowers/` permanecen fuera del commit indicado por el brief.

## Archivos

- **Create** `scripts/e2e-local-state.ts` - Genera credenciales unicas con `crypto.randomBytes`, crea los usuarios `customer`, `staff` y `admin` en Auth Emulator, asigna `emailVerified: true`, agrega solamente el claim `admin: true` al administrador, escribe perfiles/roles/catalogo/configuracion y persiste el estado en el archivo temporal.
- **Create** `scripts/e2e-local-cleanup.ts` - Reutiliza `getCleanupSafetyError`, exige confirmacion explicita, `FIREBASE_EMULATORS=true` y hosts loopback antes de importar Firebase Admin o borrar datos. Elimina pedidos, auditoria, notificaciones, perfiles de los usuarios del estado, usuarios Auth y el archivo de estado.
- **Create** `tests/e2e/local-state.ts` - Carga y valida solamente `E2E_STATE_FILE` o `.tmp/e2e/local-state.json`.
- **Create** `tests/lib/e2e-local-state.test.ts` - Pruebas unitarias sin llamadas a Firebase para dominios, contrasenas, ausencia de secretos, loader y rechazo de cleanup remoto.
- **Modify** `.gitignore` - Ignora `/.tmp/e2e/`.

## Decisiones y seguridad

- `prepareLocalE2EState()` falla antes de cargar Firebase Admin si falta `FIREBASE_EMULATORS=true`, `FIREBASE_PROJECT_ID` o alguno de los hosts loopback.
- Los correos contienen timestamp, sufijo aleatorio y terminan en `@local.test`.
- Las contrasenas se generan en memoria y solo se persisten en el JSON temporal ignorado; no se imprimen en consola ni aparecen en el codigo.
- El staff usa el documento de rol `staff` para permisos y no recibe claim administrativo.
- Los IDs de productos se toman del catalogo existente para que sean validos para checkout; las categorias y la configuracion publica usan datos locales existentes/minimos.
- El cleanup no alcanza ningun import de Firebase si falla la confirmacion o la validacion de hosts.
- El cleanup tambien exige `FIREBASE_EMULATORS=true`; por tanto, un host loopback por si solo no habilita borrado.

## TDD

### RED

Comando:

`npm test -- --run tests/lib/e2e-local-state.test.ts tests/lib/e2e-cleanup.test.ts`

Resultado: fallo esperado al no existir `scripts/e2e-local-cleanup` (`Failed to resolve import`); el test existente de cleanup paso con 4 tests.

### GREEN

Comando:

`npm test -- --run tests/lib/e2e-local-state.test.ts tests/lib/e2e-cleanup.test.ts`

Salida real:

```text
Test Files  2 passed (2)
Tests       9 passed (9)
```

## Verificaciones

### Suite dirigida

`npm test -- --run tests/lib/e2e-local-state.test.ts tests/lib/e2e-cleanup.test.ts`

Resultado: 2 archivos y 9 tests pasados, 0 fallos.

### Suite completa

`npm test`

Salida real:

```text
Test Files  40 passed (40)
Tests       181 passed (181)
Duration    14.34s
```

### Typecheck

`npm run typecheck`

Resultado: sin salida de error, exit 0.

### Lint

`npm run lint`

Resultado: sin errores ni warnings, exit 0.

### Ignorado por Git

`git check-ignore -v .tmp/e2e/local-state.json`

Salida real:

```text
.gitignore:50:/.tmp/e2e/    .tmp/e2e/local-state.json
```

### Auditoria de dependencias

`npm audit --audit-level=high`

Resultado: 66 vulnerabilidades reportadas (13 high y 53 moderate). Algunas no tienen fix disponible; las restantes requieren revisar cambios potencialmente incompatibles. No se ejecuto `npm audit fix` porque esta tarea no modifica dependencias.

## Hallazgos y concerns

1. **Concern de release:** `npm audit` mantiene vulnerabilidades heredadas en Next.js, PostCSS, sharp, Genkit/OpenTelemetry, adm-zip y uuid. No fueron introducidas por Task 2 y requieren una tarea de dependencias separada.
2. **Concern de entorno:** no se ejecuto una corrida real contra Firebase Emulator en esta tarea. La cobertura solicitada es unitaria y los tests no llaman Firebase; la validacion funcional de Auth/Firestore queda para la tarea E2E/orquestador que levante los emuladores.
3. **Concern de plataforma:** Git informa normalizacion LF/CRLF en Windows para los archivos nuevos; no afecta el comportamiento.

## Estado final

Task 2 implementada y verificada con tests dirigidos, suite completa, typecheck y lint. El commit solicitado es `4e17129`. No se hizo push.

## Review Fix Round 1

### Hallazgos corregidos

1. **Cleanup incompleto:** `LocalE2EState` ahora incluye `version`, `runId` y un manifiesto estricto de roles, productos, categorias y configuracion. `getLocalE2EResourcePlan()` cubre los 15 documentos propios del setup: 3 perfiles, 3 roles, 5 productos, 3 categorias y 1 configuracion. Cleanup verifica el marcador `e2eRunId` antes de borrar esos documentos.
2. **Rollback parcial:** el setup usa `create()` para no sobrescribir documentos ajenos, registra cada referencia creada y reutiliza `deleteOwnedLocalE2EData()` desde el catch. El rollback elimina los documentos registrados y los usuarios Auth que coincidan exactamente con el estado; si una comprobacion no coincide, falla cerrado sin borrar.
3. **Estado manipulable:** el esquema exige claves exactas, version 1, `runId` con formato generado, correos derivados del `runId`, UIDs derivados del rol y `resources` coincidente con el catalogo local. Cleanup valida todo antes de importar Firebase Admin.
4. **Cobertura funcional:** se agrego `tests/integration/e2e-local-emulator.test.ts`, con una prueba de creacion/cleanup completo y otra que fuerza un fallo al crear un rol para comprobar rollback. La prueba conserva un pedido ajeno y verifica que el archivo temporal se elimina.
5. **Gitignore:** el comentario quedo en ASCII: `# estado temporal de pruebas E2E locales`.

### TDD y diagnostico

#### RED

`npm test -- --run tests/lib/e2e-local-state.test.ts tests/lib/e2e-cleanup.test.ts tests/integration/e2e-local-emulator.test.ts`

La primera corrida de las regresiones fallo con 4 tests: el formato de correo no habia cambiado, el estado aceptaba claves extra, faltaba `getLocalE2EResourcePlan()` y cleanup importaba Firebase para un estado invalido.

#### GREEN unitario

`npm test -- --run tests/lib/e2e-local-state.test.ts tests/lib/e2e-cleanup.test.ts tests/integration/e2e-local-emulator.test.ts`

```text
Test Files  2 passed | 1 skipped (3)
Tests       12 passed | 2 skipped (14)
```

Los skips corresponden a la integracion cuando no hay variables de Emulator.

#### Integracion real contra Firebase Emulator

Comando ejecutado dentro de `firebase emulators:exec --only auth,firestore --project coctels-test` con `FIREBASE_EMULATORS=true`, `FIREBASE_PROJECT_ID=coctels-test`, hosts loopback y confirmacion `DELETE_E2E_DATA`.

```text
Test Files  1 passed (1)
Tests       2 passed (2)
Script exited successfully (code 0)
```

La corrida comprobo creacion, los 15 recursos, cleanup, conservacion de un pedido ajeno, eliminacion del archivo temporal y rollback completo cuando `roles/customer` estaba ocupado por un documento ajeno.

Durante la investigacion hubo dos intentos no concluyentes: un proceso externo ocupaba el puerto 9099 y una corrida con timeout de Vitest dejo una condicion de estado temporal. Se corrigio el timeout de integracion a 30 s, se elimino el archivo efimero generado por la corrida fallida y la ejecucion controlada posterior paso.

#### Suite completa

`npm test`

```text
Test Files  40 passed | 1 skipped (41)
Tests       184 passed | 2 skipped (186)
Duration    15.48s
```

#### Typecheck y lint

- `npm run typecheck` - exit 0, sin errores.
- `npm run lint` - exit 0, sin errores ni warnings.

### Concerns tras la ronda

1. `npm audit --audit-level=high` sigue reportando 66 vulnerabilidades heredadas (13 high, 53 moderate); no se modificaron dependencias.
2. La prueba de integracion requiere Firebase Emulator y confirmacion explicita de cleanup; sin esas variables se omite de forma visible y segura.
3. La integracion emitio `MetadataLookupWarning` de Node durante el uso local del Admin SDK; no provoco fallos y no hubo trafico remoto.

## Review Fix Round 2

### Hallazgos corregidos

1. **Ownership Auth fail-closed:** cada usuario creado recibe el claim `e2eRunId` exacto de la corrida; el administrador conserva ademas `admin: true` y customer/staff no reciben ese claim administrativo. Antes de borrar Auth, cleanup carga cada usuario y exige coincidencia exacta del claim y del email. Un mismatch aborta antes de borrar documentos o usuarios.
2. **Contador CLI:** el mensaje usa `LOCAL_E2E_ROLES.length`, un conjunto explicito de `customer`, `staff` y `admin`, en lugar de contar propiedades del estado versionado.

### TDD

#### RED

`npm test -- --run tests/lib/e2e-local-state.test.ts tests/lib/e2e-cleanup.test.ts tests/integration/e2e-local-emulator.test.ts`

La regresion del contador fallo porque `LOCAL_E2E_ROLES` aun no existia: 1 test fallo y 12 pasaron; la integracion quedo omitida sin Emulator.

#### GREEN unitario

El mismo comando despues de la implementacion:

```text
Test Files  2 passed | 1 skipped (3)
Tests       13 passed | 3 skipped (16)
```

#### Integracion real contra Firebase Emulator

`firebase emulators:exec --only auth,firestore --project coctels-test "npm test -- --run tests/integration/e2e-local-emulator.test.ts"`, con `FIREBASE_EMULATORS=true`, proyecto demo, hosts loopback y confirmacion de cleanup.

```text
Test Files  1 passed (1)
Tests       3 passed (3)
Script exited successfully (code 0)
```

La nueva prueba modifica el claim a otro `runId`, verifica el fallo cerrado y confirma que el perfil permanece; luego restaura el claim y completa cleanup. La corrida tambien cubre creacion de claims, `admin: true` del administrador y rollback.

#### Suite completa y verificaciones

- `npm test` - 40 archivos pasaron, 1 skip; 185 tests pasaron, 3 skips.
- `npm run typecheck` - exit 0, sin errores.
- `npm run lint` - exit 0, sin warnings.

### Commit

- `2ac5efe` - `fix: validar ownership Auth en cleanup E2E`

Commit nuevo posterior a `64a2cfd`; no se hizo amend ni push.

## Review Fix Round 3

### Hallazgos corregidos

1. **Rollback Auth dependiente de claims:** el rollback transaccional ahora conserva en memoria cada UID devuelto por `createUser` y elimina directamente solo esos UIDs. Ya no llama al cleanup normal ni exige `e2eRunId` durante una corrida que aun no pudo asignarlo.
2. **Rollback Firestore separado:** cada documento se registra despues de su `create()` exitoso y el rollback elimina directamente solo esas referencias. Si Firestore o Auth falla, intenta el resto de los recursos ya registrados y reporta todos los fallos sin ampliar el alcance.
3. **Cleanup normal sin relajacion:** `deleteOwnedLocalE2EData` mantiene ownership `e2eRunId` + `e2eManaged` para Firestore y `e2eRunId` + email para Auth, con fail-closed.
4. **Regresion cubierta:** la integracion fuerza un fallo en `setCustomUserClaims`, conserva un usuario Auth ajeno y verifica que solo desaparezcan los usuarios de la corrida; la prueba de fallo posterior verifica que tambien desaparezcan los perfiles propios.

### TDD

#### RED

`firebase emulators:exec --only auth,firestore --project coctels-test "npm test -- --run tests/integration/e2e-local-emulator.test.ts"`

Resultado: fallo esperado en la nueva prueba; el error fue reemplazado por `rollback incompleto` porque el usuario parcial no tenia `e2eRunId`.

#### GREEN

El mismo comando despues de la implementacion:

```text
Test Files  1 passed (1)
Tests       4 passed (4)
Script exited successfully (code 0)
```

### Verificaciones

- Suite dirigida: 2 archivos pasaron, 1 prueba de integracion omitida sin Emulator; 13 tests pasaron y 4 fueron omitidos.
- Firebase Emulator: 1 archivo y 4 tests pasaron; solo Auth/Firestore local con hosts loopback, sin trafico remoto ni credenciales reales.
- Suite completa: 40 archivos pasaron, 1 omitido; 185 tests pasaron y 4 fueron omitidos.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0, sin errores ni warnings.

### Concerns

1. `npm audit --audit-level=high` reporta 66 vulnerabilidades heredadas: 13 high y 53 moderate. Algunas no tienen fix; las correcciones restantes pueden requerir cambios incompatibles. No se ejecuto `npm audit fix`.
2. Las pruebas de integracion emiten `MetadataLookupWarning` de Node durante el uso local del Admin SDK; no provoco fallos ni trafico remoto.

### Commit

- `87deb60` - `fix: separar rollback transaccional E2E`

Commit nuevo posterior a `2ac5efe`; no se hizo amend ni push.

## Review Fix Round 4

### Hallazgos corregidos

1. **API de rollback restringida:** `rollbackLocalE2EData` ya no se exporta desde `e2e-local-cleanup.ts`. El rollback transaccional vive como helper privado de `e2e-local-state.ts` y solo recibe las referencias Firestore y UIDs registrados en memoria durante el setup.
2. **Teardown Auth acotado:** la prueba conserva `unrelatedUser.uid` y elimina únicamente ese UID en su `finally`; ya no consulta ni borra masivamente usuarios `@local.test`.
3. **Regresiones cubiertas:** una prueba unitaria verifica que cleanup no expone la API de rollback; la integración verifica que el usuario ajeno permanece hasta su eliminación explícita.

### Verificaciones

- Prueba dirigida: `npm test -- --run tests/lib/e2e-cleanup.test.ts` - 5 tests pasaron.
- Firebase Emulator real: `firebase emulators:exec --only auth,firestore --project coctels-test "npm test -- --run tests/integration/e2e-local-emulator.test.ts"` con variables de emulator y cleanup - 1 archivo, 4 tests pasaron.
- `npm test` - 40 archivos pasaron, 1 omitido; 186 tests pasaron, 4 omitidos.
- `npm run typecheck` - exit 0.
- `npm run lint` - exit 0, sin errores ni warnings.

### Concerns

1. `npm audit --audit-level=high` reporta 66 vulnerabilidades heredadas: 13 high y 53 moderate. Algunas no tienen fix; otras requieren `npm audit fix --force` con cambios incompatibles potenciales. No se ejecutó ningún fix automático.
2. La integración real emite `MetadataLookupWarning` de Node durante el uso local del Admin SDK; no provocó fallos ni tráfico remoto.
