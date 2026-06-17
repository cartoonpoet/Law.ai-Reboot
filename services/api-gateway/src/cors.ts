import os from "node:os";

const DEFAULT_FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function getHostOrigins() {
  const hosts = new Set<string>();

  for (const network of Object.values(os.networkInterfaces())) {
    for (const address of network ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        hosts.add(`http://${address.address}:5173`);
      }
    }
  }

  return [...hosts];
}

export function getAllowedOrigins() {
  const envOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_FRONTEND_ORIGINS, ...getHostOrigins(), ...envOrigins])];
}

export function isAllowedOrigin(origin?: string | null) {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}
