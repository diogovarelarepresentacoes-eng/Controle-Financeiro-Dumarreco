-- Phase 2 migration: purchases + payable linkage
-- Safe migration: create-if-not-exists and additive alterations only.

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  cnpj TEXT UNIQUE,
  legal_name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  issue_date TIMESTAMP NOT NULL,
  competence_month TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  total_amount NUMERIC(14,2) NOT NULL,
  category TEXT,
  cost_center TEXT,
  has_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL,
  nfe_access_key TEXT UNIQUE,
  nfe_number TEXT,
  nfe_series TEXT,
  nfe_nature_operation TEXT,
  recipient_name TEXT,
  recipient_cnpj TEXT,
  total_products NUMERIC(14,2),
  total_invoice NUMERIC(14,2),
  total_taxes NUMERIC(14,2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  ncm TEXT,
  quantity NUMERIC(14,4) NOT NULL,
  unit_amount NUMERIC(14,4) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_documents (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_content TEXT NOT NULL,
  nfe_access_key TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xml_import_logs (
  id TEXT PRIMARY KEY,
  performed_by TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  message TEXT NOT NULL,
  nfe_access_key TEXT,
  purchase_id TEXT
);

CREATE TABLE IF NOT EXISTS payables (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  due_date TIMESTAMP NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP,
  payment_method TEXT,
  supplier_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE payables ADD COLUMN IF NOT EXISTS purchase_id TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'payables_purchase_id_fkey'
      AND table_name = 'payables'
  ) THEN
    ALTER TABLE payables
      ADD CONSTRAINT payables_purchase_id_fkey
      FOREIGN KEY (purchase_id)
      REFERENCES purchases(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchases_competence_month ON purchases(competence_month);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payables_purchase_id ON payables(purchase_id);
CREATE INDEX IF NOT EXISTS idx_xml_import_logs_nfe_access_key ON xml_import_logs(nfe_access_key);
