// The bundled entrypoint must never inherit the development Vite middleware.
process.env.NODE_ENV = "production";
await import("../dist/server.cjs");
