-- Products import module + stock updates + inventory movements

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

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS product_prices
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS product_stock_by_stores
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS product_import_jobs (
  id TEXT PRIMARY KEY,
  type "ProductImportJobType" NOT NULL,
  "fileName" TEXT NOT NULL,
  status "ProductImportJobStatus" NOT NULL DEFAULT 'PENDING',
  "optionsJson" JSONB NOT NULL,
  "totalsJson" JSONB,
  "createdById" TEXT REFERENCES users(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "finishedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_import_errors (
  id TEXT PRIMARY KEY,
  "jobId" TEXT NOT NULL REFERENCES product_import_jobs(id) ON DELETE CASCADE,
  "rowNumber" INTEGER NOT NULL,
  "productCode" TEXT,
  "errorMessage" TEXT NOT NULL,
  "rawRowJson" JSONB
);

CREATE INDEX IF NOT EXISTS idx_product_import_errors_job_row ON product_import_errors("jobId", "rowNumber");

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "movementType" "InventoryMovementType" NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  "previousBalance" NUMERIC(12,3) NOT NULL,
  "newBalance" NUMERIC(12,3) NOT NULL,
  "referenceJobId" TEXT REFERENCES product_import_jobs(id) ON DELETE SET NULL,
  "createdById" TEXT REFERENCES users(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
