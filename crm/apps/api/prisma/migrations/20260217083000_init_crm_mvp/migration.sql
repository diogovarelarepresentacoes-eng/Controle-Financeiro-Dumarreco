-- Initial CRM MVP migration
-- Generated/maintained from prisma/schema.prisma

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  "cpfCnpj" TEXT,
  notes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL REFERENCES stores(id),
  "contactId" TEXT NOT NULL REFERENCES contacts(id),
  "assignedToId" TEXT,
  status TEXT NOT NULL DEFAULT 'ABERTO',
  "slaDueAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES conversations(id),
  "providerMessageId" TEXT,
  direction TEXT NOT NULL,
  type TEXT NOT NULL,
  body TEXT,
  "mediaUrl" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL REFERENCES stores(id),
  "conversationId" TEXT NOT NULL UNIQUE REFERENCES conversations(id),
  "assignedToId" TEXT,
  status TEXT NOT NULL DEFAULT 'ABERTO',
  tags TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "pipeline_stages" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "isClosedWon" BOOLEAN NOT NULL DEFAULT FALSE,
  "isClosedLost" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL REFERENCES stores(id),
  "conversationId" TEXT NOT NULL REFERENCES conversations(id),
  "stageId" TEXT NOT NULL REFERENCES "pipeline_stages"(id),
  name TEXT NOT NULL,
  "estimatedValue" NUMERIC(12,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL REFERENCES stores(id),
  "contactId" TEXT NOT NULL REFERENCES contacts(id),
  "opportunityId" TEXT REFERENCES opportunities(id),
  "createdById" TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  "discountPercent" NUMERIC(5,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ENVIADO',
  "pdfUrl" TEXT,
  "approvedAtWhatsApp" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  "quoteId" TEXT NOT NULL REFERENCES quotes(id),
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  "unitPrice" NUMERIC(12,2) NOT NULL,
  "discountPct" NUMERIC(5,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES conversations(id),
  "inputContextIds" TEXT[] NOT NULL DEFAULT '{}',
  "responseDraft" TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  sources TEXT[] NOT NULL DEFAULT '{}',
  "requiresHuman" BOOLEAN NOT NULL,
  "approvedById" TEXT,
  "finalSentMessageId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  "entityId" TEXT,
  "beforeData" JSONB,
  "afterData" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
