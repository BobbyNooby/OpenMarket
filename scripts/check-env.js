import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Required environment variables (add/remove as needed)
const requiredVars = [
  "DATABASE_URL",
  "REDIS_URL",
  "BETTER_AUTH_SECRET",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "PUBLIC_API_URL",
  "API_MASTER_KEY",
  "API_PORT",
  "NODE_ENV",
];

const envPath = resolve(root, ".env");

if (!existsSync(envPath)) {
  console.error("\n❌ Missing .env file\n");
  console.error("   Copy from .env.example and configure as needed.\n");
  process.exit(1);
}

// Parse .env file
const envContent = readFileSync(envPath, "utf-8");
const envVars = new Set();

for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const match = trimmed.match(/^([^=]+)=/);
    if (match) {
      envVars.add(match[1].trim());
    }
  }
}

const missing = requiredVars.filter((v) => !envVars.has(v));

if (missing.length > 0) {
  console.error("\n❌ Missing required environment variables:\n");
  missing.forEach((v) => {
    console.error(`   - ${v}`);
  });
  console.error("\n   Check .env.example for reference.\n");
  process.exit(1);
}

console.log("✓ All required environment variables found");
