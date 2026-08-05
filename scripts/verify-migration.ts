import { verifyMigration } from "./migrate-orders";

export { verifyMigration };

if (require.main === module) {
  verifyMigration()
    .then((result) => {
      console.log(`Verificación de migración: ${result.ok ? "OK" : "FALLÓ"}. Fuente: ${result.sourceCount}; destino legado: ${result.targetCount}.`);
      if (!result.ok) {
        console.error(JSON.stringify(result, null, 2));
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      console.error("No fue posible verificar la migración", error instanceof Error ? error.message : "Error desconocido");
      process.exitCode = 1;
    });
}
