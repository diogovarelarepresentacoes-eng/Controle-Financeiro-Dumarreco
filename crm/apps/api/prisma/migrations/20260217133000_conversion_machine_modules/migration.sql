-- Sales conversion machine modules: copilot, risk, scoring, worksite enhancements

DO $$ BEGIN
  CREATE TYPE "CustomerTier" AS ENUM ('PREMIUM', 'RECORRENTE', 'OBRA_GRANDE', 'SENSIVEL_PRECO', 'NOVO_CLIENTE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RiskLevel" AS ENUM ('BAIXO', 'MEDIO', 'ALTO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowupTaskStatus" AS ENUM ('PENDING', 'DONE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE worksites RENAME COLUMN location TO address;
ALTER TABLE worksites ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE worksites ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE worksites ADD COLUMN IF NOT EXISTS "recurringMaterials" TEXT[] DEFAULT '{}';
ALTER TABLE worksites ADD COLUMN IF NOT EXISTS "estimatedDurationDays" INTEGER;

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS "worksiteId" TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS "riskLevel" "RiskLevel" NOT NULL DEFAULT 'BAIXO';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS "riskReasons" TEXT[] DEFAULT '{}';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS "needsSupervisorApproval" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS "CustomerScore" (
  id TEXT PRIMARY KEY,
  "contactId" TEXT NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  "frequencyScore" INTEGER NOT NULL,
  "avgTicketScore" INTEGER NOT NULL,
  "responseTimeScore" INTEGER NOT NULL,
  "complaintsScore" INTEGER NOT NULL,
  "activeWorksitesScore" INTEGER NOT NULL,
  "totalScore" INTEGER NOT NULL,
  tier "CustomerTier" NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SalesCopilotSuggestion" (
  id TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  "requiresHuman" BOOLEAN NOT NULL,
  reasoning TEXT NOT NULL,
  "closureProbability" NUMERIC(5,2) NOT NULL,
  "estimatedTicket" NUMERIC(12,2) NOT NULL,
  "repurchaseChance" NUMERIC(5,2) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "RiskEvent" (
  id TEXT PRIMARY KEY,
  "quoteId" TEXT,
  "conversationId" TEXT,
  level "RiskLevel" NOT NULL,
  reason TEXT NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "QuoteFollowupTask" (
  id TEXT PRIMARY KEY,
  "quoteId" TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  status "FollowupTaskStatus" NOT NULL DEFAULT 'PENDING',
  "suggestedMessage" TEXT,
  "dueAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
