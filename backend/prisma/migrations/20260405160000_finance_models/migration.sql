-- CreateTable
CREATE TABLE "TaxaCartao" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipoCartao" TEXT NOT NULL,
    "quantidadeParcelas" INTEGER NOT NULL,
    "taxaPercentual" DECIMAL(5,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaxaCartao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TaxaCartao_tipoCartao_quantidadeParcelas_key" ON "TaxaCartao"("tipoCartao", "quantidadeParcelas");

-- CreateTable
CREATE TABLE "ContaBanco" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT NOT NULL,
    "conta" TEXT NOT NULL,
    "saldoInicial" DECIMAL(14,2) NOT NULL,
    "saldoAtual" DECIMAL(14,2) NOT NULL,
    "formasAceitas" JSONB NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContaBanco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boleto" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "vencimento" TEXT NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TEXT,
    "origemPagamento" TEXT,
    "contaBancoId" TEXT,
    "compraId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Boleto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoBancaria" (
    "id" TEXT NOT NULL,
    "contaBancoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "boletoId" TEXT,
    "vendaId" TEXT,
    "despesaId" TEXT,
    "data" TEXT NOT NULL,
    CONSTRAINT "MovimentacaoBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "contaBancoId" TEXT,
    "data" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maquinaCartaoId" TEXT,
    "maquinaCartaoNome" TEXT,
    "tipoPagamentoCartao" TEXT,
    "quantidadeParcelas" INTEGER,
    "valorBruto" DECIMAL(14,2),
    "taxaPercentualCartao" DECIMAL(5,2),
    "valorTaxaCartao" DECIMAL(14,2),
    "valorLiquido" DECIMAL(14,2),
    "observacaoFinanceira" TEXT,
    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaturamentoMensal" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "valorInventarioInicio" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "usarInventarioInicioManual" BOOLEAN NOT NULL DEFAULT false,
    "valorInventarioFim" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "usarInventarioFimManual" BOOLEAN NOT NULL DEFAULT false,
    "comprasDoMes" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "compraSemNota" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "acordos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "mercadorias" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FaturamentoMensal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FaturamentoMensal_ano_mes_key" ON "FaturamentoMensal"("ano", "mes");

-- CreateTable
CREATE TABLE "Despesa" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "dataVencimento" TEXT NOT NULL,
    "dataPagamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "formaPagamento" TEXT NOT NULL,
    "origemPagamento" TEXT,
    "contaBancoId" TEXT,
    "fornecedor" TEXT NOT NULL DEFAULT '',
    "centroCusto" TEXT NOT NULL DEFAULT '',
    "observacoes" TEXT NOT NULL DEFAULT '',
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "periodicidade" TEXT,
    "recorrenciaOrigemId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedRecurrenceMarker" (
    "id" TEXT NOT NULL,
    "origemId" TEXT NOT NULL,
    "dataVencimento" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeletedRecurrenceMarker_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeletedRecurrenceMarker_origemId_dataVencimento_key" ON "DeletedRecurrenceMarker"("origemId", "dataVencimento");

-- AddForeignKeys
ALTER TABLE "Boleto" ADD CONSTRAINT "Boleto_contaBancoId_fkey" FOREIGN KEY ("contaBancoId") REFERENCES "ContaBanco"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoBancaria" ADD CONSTRAINT "MovimentacaoBancaria_contaBancoId_fkey" FOREIGN KEY ("contaBancoId") REFERENCES "ContaBanco"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoBancaria" ADD CONSTRAINT "MovimentacaoBancaria_boletoId_fkey" FOREIGN KEY ("boletoId") REFERENCES "Boleto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoBancaria" ADD CONSTRAINT "MovimentacaoBancaria_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoBancaria" ADD CONSTRAINT "MovimentacaoBancaria_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "Despesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_contaBancoId_fkey" FOREIGN KEY ("contaBancoId") REFERENCES "ContaBanco"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_contaBancoId_fkey" FOREIGN KEY ("contaBancoId") REFERENCES "ContaBanco"("id") ON DELETE SET NULL ON UPDATE CASCADE;
