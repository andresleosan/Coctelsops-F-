import { runCatalogImport } from "../src/lib/catalog/importer";

export { runCatalogImport };

async function main(): Promise<void> {
  const report = await runCatalogImport({ dryRun: !process.argv.includes("--write") });
  console.log(JSON.stringify(report));
  if (report.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("scripts/import-catalog.ts")) {
  void main();
}
