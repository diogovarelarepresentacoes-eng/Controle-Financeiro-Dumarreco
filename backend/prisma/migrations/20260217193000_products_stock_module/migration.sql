-- Products and stock module

DO $$ BEGIN
  CREATE TYPE "ProductImportJobType" AS ENUM ('PRODUCT_IMPORT', 'STOCK_UPDATE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryMovementType" AS ENUM ('IMPORT_SET', 'IMPORT_ADD', 'MANUAL_ADJUST');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Product" (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  "priceInstallment" NUMERIC(12,2) NOT NULL,
  "stockBalance" NUMERIC(12,3) NOT NULL,
  unit TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_code ON "Product"(code);

CREATE TABLE IF NOT EXISTS "ProductImportJob" (
  id TEXT PRIMARY KEY,
  type "ProductImportJobType" NOT NULL,
  "fileName" TEXT NOT NULL,
  status "ProductImportJobStatus" NOT NULL DEFAULT 'PENDING',
  "optionsJson" JSONB NOT NULL,
  "totalsJson" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "finishedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductImportError" (
  id TEXT PRIMARY KEY,
  "jobId" TEXT NOT NULL REFERENCES "ProductImportJob"(id) ON DELETE CASCADE,
  "rowNumber" INTEGER NOT NULL,
  "productCode" TEXT,
  "errorMessage" TEXT NOT NULL,
  "rawRowJson" JSONB
);

CREATE INDEX IF NOT EXISTS idx_product_import_error_job_row ON "ProductImportError"("jobId", "rowNumber");

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  "movementType" "InventoryMovementType" NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  "previousBalance" NUMERIC(12,3) NOT NULL,
  "newBalance" NUMERIC(12,3) NOT NULL,
  "referenceJobId" TEXT REFERENCES "ProductImportJob"(id) ON DELETE SET NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
