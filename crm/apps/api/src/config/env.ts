import { z } from "zod";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv();
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });

const nodeEnv = (process.env.NODE_ENV ?? "development").toLowerCase();
if (nodeEnv !== "production") {
  if (!process.env.DATABASE_URL) {
    // Em dev local, o docker-compose do CRM expõe Postgres em 5434 e DB crm_dumarreco.
    const port = process.env.POSTGRES_PORT ?? "5434";
    const db = process.env.POSTGRES_DB ?? "crm_dumarreco";
    process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:${port}/${db}?schema=public`;
  }
  if (!process.env.WHATSAPP_WEBHOOK_SECRET) {
    process.env.WHATSAPP_WEBHOOK_SECRET = "dev-webhook-secret";
  }
}

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(4000),
  // Em testes unitários não precisamos de conexão real com DB/WhatsApp.
  // Em dev/prod continuamos exigindo.
  DATABASE_URL: z.string().min(1).optional(),
  WHATSAPP_WEBHOOK_SECRET: z.string().min(8).optional(),
  REMINDER_JOB_INTERVAL_MINUTES: z.coerce.number().default(60),
  SECRET_KEY: z.string().min(16).default("dev-secret-key-change-me"),
  APP_BASE_URL: z.string().url().default("http://localhost:4000"),
  FINANCE_API_URL: z.string().url().default("http://localhost:3333"),
  CUSTOMER_SCORE_JOB_INTERVAL_HOURS: z.coerce.number().default(24),
  QUOTE_RECOVERY_JOB_INTERVAL_MINUTES: z.coerce.number().default(60)
});

const parsed = schema.parse(process.env);

if (parsed.NODE_ENV !== "test") {
  if (!parsed.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!parsed.WHATSAPP_WEBHOOK_SECRET) throw new Error("WHATSAPP_WEBHOOK_SECRET is required (min 8 chars)");
}

export const env = {
  ...parsed,
  DATABASE_URL: parsed.DATABASE_URL ?? "test",
  WHATSAPP_WEBHOOK_SECRET: parsed.WHATSAPP_WEBHOOK_SECRET ?? "test-secret"
};
