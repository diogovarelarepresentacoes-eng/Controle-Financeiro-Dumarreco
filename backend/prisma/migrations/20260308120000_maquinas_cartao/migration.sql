-- CreateTable
CREATE TABLE "MaquinaCartao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "adquirente" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaquinaCartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxaMaquinaCartao" (
    "id" TEXT NOT NULL,
    "maquinaCartaoId" TEXT NOT NULL,
    "tipoCartao" TEXT NOT NULL,
    "parcelas" INTEGER NOT NULL,
    "taxaPercentual" DECIMAL(5,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxaMaquinaCartao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaquinaCartao_ativo_idx" ON "MaquinaCartao"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "TaxaMaquinaCartao_maquinaCartaoId_tipoCartao_parcelas_key" ON "TaxaMaquinaCartao"("maquinaCartaoId", "tipoCartao", "parcelas");
CREATE INDEX "TaxaMaquinaCartao_maquinaCartaoId_tipoCartao_parcelas_idx" ON "TaxaMaquinaCartao"("maquinaCartaoId", "tipoCartao", "parcelas");

-- AddForeignKey
ALTER TABLE "TaxaMaquinaCartao" ADD CONSTRAINT "TaxaMaquinaCartao_maquinaCartaoId_fkey" FOREIGN KEY ("maquinaCartaoId") REFERENCES "MaquinaCartao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable (remove old TaxaCartao)
DROP TABLE IF EXISTS "TaxaCartao";
