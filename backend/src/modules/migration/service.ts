import { prisma } from '../../infra/prismaClient'

interface LegacyData {
  contas?: Array<Record<string, unknown>>
  boletos?: Array<Record<string, unknown>>
  movimentacoes?: Array<Record<string, unknown>>
  vendas?: Array<Record<string, unknown>>
  faturamentoMensal?: Array<Record<string, unknown>>
  despesas?: Array<Record<string, unknown>>
  despesasDeletedRecurrences?: Array<Record<string, unknown>>
}

export const migrationService = {
  async importLegacy(data: LegacyData) {
    const counts = {
      contas: 0,
      boletos: 0,
      movimentacoes: 0,
      vendas: 0,
      faturamentoMensal: 0,
      despesas: 0,
      deletedRecurrenceMarkers: 0,
    }

    if (data.contas?.length) {
      for (const c of data.contas) {
        await prisma.contaBanco.upsert({
          where: { id: String(c.id) },
          update: {
            nome: String(c.nome ?? ''),
            banco: String(c.banco ?? ''),
            agencia: String(c.agencia ?? ''),
            conta: String(c.conta ?? ''),
            saldoInicial: Number(c.saldoInicial ?? 0),
            saldoAtual: Number(c.saldoAtual ?? 0),
            formasAceitas: (c.formasAceitas as string[]) ?? [],
            ativo: c.ativo !== false,
          },
          create: {
            id: String(c.id),
            nome: String(c.nome ?? ''),
            banco: String(c.banco ?? ''),
            agencia: String(c.agencia ?? ''),
            conta: String(c.conta ?? ''),
            saldoInicial: Number(c.saldoInicial ?? 0),
            saldoAtual: Number(c.saldoAtual ?? 0),
            formasAceitas: (c.formasAceitas as string[]) ?? [],
            ativo: c.ativo !== false,
          },
        })
        counts.contas++
      }
    }

    if (data.vendas?.length) {
      for (const v of data.vendas) {
        await prisma.venda.upsert({
          where: { id: String(v.id) },
          update: {
            descricao: String(v.descricao ?? ''),
            valor: Number(v.valor ?? 0),
            formaPagamento: String(v.formaPagamento ?? ''),
            contaBancoId: v.contaBancoId ? String(v.contaBancoId) : null,
            data: String(v.data ?? ''),
            maquinaCartaoId: v.maquinaCartaoId ? String(v.maquinaCartaoId) : null,
            maquinaCartaoNome: v.maquinaCartaoNome ? String(v.maquinaCartaoNome) : null,
            tipoPagamentoCartao: v.tipoPagamentoCartao ? String(v.tipoPagamentoCartao) : null,
            quantidadeParcelas: v.quantidadeParcelas != null ? Number(v.quantidadeParcelas) : null,
            valorBruto: v.valorBruto != null ? Number(v.valorBruto) : null,
            taxaPercentualCartao: v.taxaPercentualCartao != null ? Number(v.taxaPercentualCartao) : null,
            valorTaxaCartao: v.valorTaxaCartao != null ? Number(v.valorTaxaCartao) : null,
            valorLiquido: v.valorLiquido != null ? Number(v.valorLiquido) : null,
            observacaoFinanceira: v.observacaoFinanceira ? String(v.observacaoFinanceira) : null,
          },
          create: {
            id: String(v.id),
            descricao: String(v.descricao ?? ''),
            valor: Number(v.valor ?? 0),
            formaPagamento: String(v.formaPagamento ?? ''),
            contaBancoId: v.contaBancoId ? String(v.contaBancoId) : null,
            data: String(v.data ?? ''),
            maquinaCartaoId: v.maquinaCartaoId ? String(v.maquinaCartaoId) : null,
            maquinaCartaoNome: v.maquinaCartaoNome ? String(v.maquinaCartaoNome) : null,
            tipoPagamentoCartao: v.tipoPagamentoCartao ? String(v.tipoPagamentoCartao) : null,
            quantidadeParcelas: v.quantidadeParcelas != null ? Number(v.quantidadeParcelas) : null,
            valorBruto: v.valorBruto != null ? Number(v.valorBruto) : null,
            taxaPercentualCartao: v.taxaPercentualCartao != null ? Number(v.taxaPercentualCartao) : null,
            valorTaxaCartao: v.valorTaxaCartao != null ? Number(v.valorTaxaCartao) : null,
            valorLiquido: v.valorLiquido != null ? Number(v.valorLiquido) : null,
            observacaoFinanceira: v.observacaoFinanceira ? String(v.observacaoFinanceira) : null,
          },
        })
        counts.vendas++
      }
    }

    if (data.boletos?.length) {
      for (const b of data.boletos) {
        await prisma.boleto.upsert({
          where: { id: String(b.id) },
          update: {
            descricao: String(b.descricao ?? ''),
            valor: Number(b.valor ?? 0),
            vencimento: String(b.vencimento ?? ''),
            pago: b.pago === true,
            dataPagamento: b.dataPagamento ? String(b.dataPagamento) : null,
            origemPagamento: b.origemPagamento ? String(b.origemPagamento) : null,
            contaBancoId: b.contaBancoId ? String(b.contaBancoId) : null,
            compraId: b.compraId ? String(b.compraId) : null,
          },
          create: {
            id: String(b.id),
            descricao: String(b.descricao ?? ''),
            valor: Number(b.valor ?? 0),
            vencimento: String(b.vencimento ?? ''),
            pago: b.pago === true,
            dataPagamento: b.dataPagamento ? String(b.dataPagamento) : null,
            origemPagamento: b.origemPagamento ? String(b.origemPagamento) : null,
            contaBancoId: b.contaBancoId ? String(b.contaBancoId) : null,
            compraId: b.compraId ? String(b.compraId) : null,
          },
        })
        counts.boletos++
      }
    }

    if (data.movimentacoes?.length) {
      for (const m of data.movimentacoes) {
        await prisma.movimentacaoBancaria.upsert({
          where: { id: String(m.id) },
          update: {
            contaBancoId: String(m.contaBancoId ?? ''),
            tipo: String(m.tipo ?? ''),
            valor: Number(m.valor ?? 0),
            descricao: String(m.descricao ?? ''),
            boletoId: m.boletoId ? String(m.boletoId) : null,
            vendaId: m.vendaId ? String(m.vendaId) : null,
            despesaId: m.despesaId ? String(m.despesaId) : null,
            data: String(m.data ?? ''),
          },
          create: {
            id: String(m.id),
            contaBancoId: String(m.contaBancoId ?? ''),
            tipo: String(m.tipo ?? ''),
            valor: Number(m.valor ?? 0),
            descricao: String(m.descricao ?? ''),
            boletoId: m.boletoId ? String(m.boletoId) : null,
            vendaId: m.vendaId ? String(m.vendaId) : null,
            despesaId: m.despesaId ? String(m.despesaId) : null,
            data: String(m.data ?? ''),
          },
        })
        counts.movimentacoes++
      }
    }

    if (data.faturamentoMensal?.length) {
      for (const f of data.faturamentoMensal) {
        const ano = Number(f.ano)
        const mes = Number(f.mes)
        await prisma.faturamentoMensal.upsert({
          where: { ano_mes: { ano, mes } },
          update: {
            valorInventarioInicio: Number(f.valorInventarioInicio ?? 0),
            usarInventarioInicioManual: f.usarInventarioInicioManual === true,
            valorInventarioFim: Number(f.valorInventarioFim ?? 0),
            usarInventarioFimManual: f.usarInventarioFimManual === true,
            comprasDoMes: Number(f.comprasDoMes ?? 0),
            compraSemNota: Number(f.compraSemNota ?? 0),
            acordos: Number(f.acordos ?? 0),
            mercadorias: Number(f.mercadorias ?? 0),
          },
          create: {
            id: f.id ? String(f.id) : crypto.randomUUID(),
            ano,
            mes,
            valorInventarioInicio: Number(f.valorInventarioInicio ?? 0),
            usarInventarioInicioManual: f.usarInventarioInicioManual === true,
            valorInventarioFim: Number(f.valorInventarioFim ?? 0),
            usarInventarioFimManual: f.usarInventarioFimManual === true,
            comprasDoMes: Number(f.comprasDoMes ?? 0),
            compraSemNota: Number(f.compraSemNota ?? 0),
            acordos: Number(f.acordos ?? 0),
            mercadorias: Number(f.mercadorias ?? 0),
          },
        })
        counts.faturamentoMensal++
      }
    }

    if (data.despesas?.length) {
      for (const d of data.despesas) {
        await prisma.despesa.upsert({
          where: { id: String(d.id) },
          update: {
            descricao: String(d.descricao ?? ''),
            categoria: String(d.categoria ?? ''),
            tipo: String(d.tipo ?? ''),
            valor: Number(d.valor ?? 0),
            dataVencimento: String(d.dataVencimento ?? ''),
            dataPagamento: d.dataPagamento ? String(d.dataPagamento) : null,
            status: String(d.status ?? 'pendente'),
            formaPagamento: String(d.formaPagamento ?? ''),
            origemPagamento: d.origemPagamento ? String(d.origemPagamento) : null,
            contaBancoId: d.contaBancoId ? String(d.contaBancoId) : null,
            fornecedor: String(d.fornecedor ?? ''),
            centroCusto: String(d.centroCusto ?? ''),
            observacoes: String(d.observacoes ?? ''),
            recorrente: d.recorrente === true,
            periodicidade: d.periodicidade ? String(d.periodicidade) : null,
            recorrenciaOrigemId: d.recorrenciaOrigemId ? String(d.recorrenciaOrigemId) : null,
          },
          create: {
            id: String(d.id),
            descricao: String(d.descricao ?? ''),
            categoria: String(d.categoria ?? ''),
            tipo: String(d.tipo ?? ''),
            valor: Number(d.valor ?? 0),
            dataVencimento: String(d.dataVencimento ?? ''),
            dataPagamento: d.dataPagamento ? String(d.dataPagamento) : null,
            status: String(d.status ?? 'pendente'),
            formaPagamento: String(d.formaPagamento ?? ''),
            origemPagamento: d.origemPagamento ? String(d.origemPagamento) : null,
            contaBancoId: d.contaBancoId ? String(d.contaBancoId) : null,
            fornecedor: String(d.fornecedor ?? ''),
            centroCusto: String(d.centroCusto ?? ''),
            observacoes: String(d.observacoes ?? ''),
            recorrente: d.recorrente === true,
            periodicidade: d.periodicidade ? String(d.periodicidade) : null,
            recorrenciaOrigemId: d.recorrenciaOrigemId ? String(d.recorrenciaOrigemId) : null,
          },
        })
        counts.despesas++
      }
    }

    if (data.despesasDeletedRecurrences?.length) {
      for (const m of data.despesasDeletedRecurrences) {
        const origemId = String(m.origemId)
        const dataVencimento = String(m.dataVencimento)
        await prisma.deletedRecurrenceMarker.upsert({
          where: { origemId_dataVencimento: { origemId, dataVencimento } },
          update: {},
          create: {
            id: crypto.randomUUID(),
            origemId,
            dataVencimento,
          },
        })
        counts.deletedRecurrenceMarkers++
      }
    }

    return { success: true, counts }
  },
}
