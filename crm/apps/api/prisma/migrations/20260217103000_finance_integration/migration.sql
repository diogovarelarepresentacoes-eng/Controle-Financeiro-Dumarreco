-- Finance integration for quote -> receivable -> cobrança -> payment

DO $$ BEGIN
  CREATE TYPE "ProductUnit" AS ENUM ('SACO', 'M3', 'UNIDADE', 'LATA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReceivableStatus" AS ENUM ('PENDENTE', 'COBRANDO', 'PAGO', 'VENCIDO', 'CANCELADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE products
  ALTER COLUMN unit TYPE "ProductUnit"
  USING (
    CASE
      WHEN unit = 'UN' THEN 'UNIDADE'::"ProductUnit"
      WHEN unit = 'M3' THEN 'M3'::"ProductUnit"
      WHEN unit = 'LATA' THEN 'LATA'::"ProductUnit"
      ELSE 'SACO'::"ProductUnit"
    END
  );

CREATE TABLE IF NOT EXISTS price_rules (
  id TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL REFERENCES stores(id),
  "productId" TEXT REFERENCES products(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  "maxDiscount" NUMERIC(5,2) NOT NULL,
  "minUnitPrice" NUMERIC(12,2),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receivables (
  id TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES conversations(id),
  "contactId" TEXT NOT NULL REFERENCES contacts(id),
  "quoteId" TEXT NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
  total NUMERIC(12,2) NOT NULL,
  "dueDate" TIMESTAMP NOT NULL,
  status "ReceivableStatus" NOT NULL DEFAULT 'PENDENTE',
  "paymentMethod" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "chargeLink" TEXT,
  "boletoExternalRef" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receivable_installments (
  id TEXT PRIMARY KEY,
  "receivableId" TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  "dueDate" TIMESTAMP NOT NULL,
  status "ReceivableStatus" NOT NULL DEFAULT 'PENDENTE'
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  "receivableId" TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  "paidAt" TIMESTAMP NOT NULL,
  method TEXT NOT NULL,
  reference TEXT
);

CREATE TABLE IF NOT EXISTS fiscal_docs (
  id TEXT PRIMARY KEY,
  "receivableId" TEXT,
  "quoteId" TEXT,
  "externalRef" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charge_reminder_logs (
  id TEXT PRIMARY KEY,
  "receivableId" TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  "reminderType" TEXT NOT NULL,
  "sentAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("receivableId", "reminderType")
);

CREATE INDEX IF NOT EXISTS idx_receivable_installments_due_date ON receivable_installments("dueDate");
