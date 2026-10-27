export interface StorageSafetyEnvironment {
  NODE_ENV?: string;
  GARAGE_ALLOW_EPHEMERAL_STORAGE?: string;
}

/**
 * Cloud Run's writable container filesystem is ephemeral and not shared across
 * instances. Block production startup until a durable/shared storage adapter is
 * configured. The opt-in exists only for explicitly approved temporary demos.
 */
export function assertProductionStorageSafe(env: StorageSafetyEnvironment): void {
  if (env.NODE_ENV === "production" && env.GARAGE_ALLOW_EPHEMERAL_STORAGE !== "true") {
    throw new Error(
      "Production startup blocked: GarageAI still uses local JSON files for garage data and sessions. " +
      "Configure a durable shared database/session store before production traffic. " +
      "For a temporary demo only, explicitly set GARAGE_ALLOW_EPHEMERAL_STORAGE=true.",
    );
  }
}
