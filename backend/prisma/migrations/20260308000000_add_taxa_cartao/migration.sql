-- Taxas de cartão para vendas (débito e crédito 1x-12x)

CREATE TABLE IF NOT EXISTS "TaxaCartao" (
  id TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  "tipoCartao" TEXT NOT NULL,
  "quantidadeParcelas" INTEGER NOT NULL,
  "taxaPercentual" NUMERIC(5,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaxaCartao_tipoCartao_quantidadeParcelas_key" ON "TaxaCartao"("tipoCartao", "quantidadeParcelas");
CREATE INDEX IF NOT EXISTS "TaxaCartao_tipoCartao_quantidadeParcelas_idx" ON "TaxaCartao"("tipoCartao", "quantidadeParcelas");
