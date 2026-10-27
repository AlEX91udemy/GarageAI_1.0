import { PostgresPersistence } from "../server/postgresPersistence";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const repository = new PostgresPersistence({
    connectionString,
    maxConnections: 1,
    ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
    runMigrations: true,
  });
  try {
    await repository.initialize();
    await repository.healthCheck();
    console.log("GarageAI PostgreSQL migrations completed and verified.");
  } finally {
    await repository.close();
  }
}

main().catch((error) => {
  // Do not dump connection configuration or SQL parameters into CI/terminal logs.
  console.error("PostgreSQL migration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
