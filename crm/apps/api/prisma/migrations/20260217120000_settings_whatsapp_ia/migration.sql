-- WhatsApp & IA settings module

DO $$ BEGIN
  CREATE TYPE "ProviderType" AS ENUM ('META_CLOUD_API', 'TWILIO_WHATSAPP', 'ZENVIA_WHATSAPP', 'DIALOG_360', 'CUSTOM_WEBHOOK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AiMode" AS ENUM ('MANUAL', 'ASSISTIDO', 'AUTO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageLogStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "WhatsAppSetting" (
  id TEXT PRIMARY KEY,
  "accountName" TEXT NOT NULL,
  "providerType" "ProviderType" NOT NULL,
  "phoneNumberE164" TEXT NOT NULL,
  "countryCode" TEXT,
  "configJson" TEXT NOT NULL,
  "webhookVerifyToken" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AiSetting" (
  id TEXT PRIMARY KEY,
  "businessRulesPrompt" TEXT NOT NULL,
  "modeDefault" "AiMode" NOT NULL DEFAULT 'ASSISTIDO',
  "confidenceThreshold" NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "WhatsAppMessageLog" (
  id TEXT PRIMARY KEY,
  "providerType" "ProviderType" NOT NULL,
  "fromNumber" TEXT,
  "toNumber" TEXT NOT NULL,
  "payloadPreview" TEXT NOT NULL,
  status "MessageLogStatus" NOT NULL,
  "externalMessageId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  id TEXT PRIMARY KEY,
  "providerType" "ProviderType" NOT NULL,
  "eventType" TEXT NOT NULL,
  "rawPayload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
