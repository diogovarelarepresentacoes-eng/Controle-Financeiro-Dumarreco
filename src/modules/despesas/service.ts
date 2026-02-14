import { addMonths, addWeeks, addYears, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { despesasRepository } from './repository'
import type { DashboardDespesas, Despesa, FiltrosDespesas, PeriodicidadeDespesa, StatusDespesa } from './model'
import { CATEGORIAS_DESPESA } from './model'

type CriarDespesaInput = Omit<Despesa, 'id' | 'criadoEm' | 'atualizadoEm' | 'recorrenciaOrigemId'>
type AtualizarDespesaInput = Partial<CriarDespesaInput>

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function proximaData(baseDateIso: string, periodicidade: PeriodicidadeDespesa): string {
  const base = parseISO(baseDateIso)
  const next =
    periodicidade === 'semanal'
      ? addWeeks(base, 1)
      : periodicidade === 'anual'
        ? addYears(base, 1)
        : addMonths(base, 1)
  return format(next, 'yyyy-MM-dd')
}

function atualizarStatusPeloVencimento(item: Despesa, hoje: string): Despesa {
  if (item.status === 'pago' || item.dataPagamento) return item
  if (item.dataVencimento < hoje) return { ...item, status: 'atrasado' }
  return { ...item, status: 'pendente' }
}

function gerarRecorrencias(list: Despesa[]): Despesa[] {
  const limiteGeracao = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  let resultado = [...list]
  const recorrentes = resultado.filter((d) => d.recorrente && d.periodicidade)

  for (const mestre of recorrentes) {
    const origemId = mestre.recorrenciaOrigemId ?? mestre.id
    const grupo = resultado.filter((d) => (d.recorrenciaOrigemId ?? d.id) === origemId)
    let maxData = grupo.reduce((max, d) => (d.dataVencimento > max ? d.dataVencimento : max), mestre.dataVencimento)

    while (true) {
      const proxima = proximaData(maxData, mestre.periodicidade!)
      if (proxima > limiteGeracao) break
      const jaExiste = resultado.some((d) => (d.recorrenciaOrigemId ?? d.id) === origemId && d.dataVencimento === proxima)
      if (!jaExiste) {
        const now = new Date().toISOString()
        resultado.push({
          ...mestre,
          id: crypto.randomUUID(),
          dataVencimento: proxima,
          dataPagamento: undefined,
          status: 'pendente',
          recorrenciaOrigemId: origemId,
          criadoEm: now,
          atualizadoEm: now,
        })
      }
      maxData = proxima
    }
  }

  return resultado
}

function aplicarRegrasAutomaticas(): Despesa[] {
  despesasRepository.ensureSeed()
  const inicial = despesasRepository.getAll()
  const comRecorrencias = gerarRecorrencias(inicial)
  const hoje = hojeISO()
  const final = comRecorrencias.map((d) => atualizarStatusPeloVencimento(d, hoje))
  despesasRepository.saveAll(final)
  return final
}

function filtrar(list: Despesa[], filtros?: FiltrosDespesas): Despesa[] {
  if (!filtros) return list
  return list.filter((d) => {
    const porDataInicio = !filtros.dataInicio || d.dataVencimento >= filtros.dataInicio
    const porDataFim = !filtros.dataFim || d.dataVencimento <= filtros.dataFim
    const porCategoria = !filtros.categoria || filtros.categoria === 'todas' || d.categoria === filtros.categoria
    const porStatus = !filtros.status || filtros.status === 'todos' || d.status === filtros.status
    const termo = (filtros.busca ?? '').trim().toLowerCase()
    const porBusca =
      !termo ||
      d.descricao.toLowerCase().includes(termo) ||
      d.fornecedor.toLowerCase().includes(termo) ||
      d.centroCusto.toLowerCase().includes(termo)
    return porDataInicio && porDataFim && porCategoria && porStatus && porBusca
  })
}

function statusNormalizado(status: StatusDespesa, dataPagamento?: string): StatusDespesa {
  if (dataPagamento) return 'pago'
  if (status === 'pago') return 'pendente'
  return status
}

function somarPorMes(list: Despesa[], anoMes: string): number {
  return list
    .filter((d) => d.dataVencimento.slice(0, 7) === anoMes)
    .reduce((s, d) => s + d.valor, 0)
}

export const despesasService = {
  list: (filtros?: FiltrosDespesas): Despesa[] => {
    const atualizada = aplicarRegrasAutomaticas()
    return filtrar(atualizada, filtros).sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento))
  },

  getById: (id: string): Despesa | undefined => {
    const list = aplicarRegrasAutomaticas()
    return list.find((d) => d.id === id)
  },

  create: (input: CriarDespesaInput): Despesa => {
    const now = new Date().toISOString()
    const item: Despesa = {
      ...input,
      id: crypto.randomUUID(),
      status: statusNormalizado(input.status, input.dataPagamento),
      recorrenciaOrigemId: input.recorrente ? '' : undefined,
      criadoEm: now,
      atualizadoEm: now,
    }
    const withOrigem = { ...item, recorrenciaOrigemId: item.recorrente ? item.id : undefined }
    despesasRepository.save(withOrigem)
    return withOrigem
  },

  update: (id: string, input: AtualizarDespesaInput): Despesa => {
    const existente = despesasRepository.getById(id)
    if (!existente) throw new Error('Despesa nao encontrada')
    const merged: Despesa = {
      ...existente,
      ...input,
      status: statusNormalizado(input.status ?? existente.status, input.dataPagamento ?? existente.dataPagamento),
      recorrenciaOrigemId: (input.recorrente ?? existente.recorrente) ? (existente.recorrenciaOrigemId ?? existente.id) : undefined,
      atualizadoEm: new Date().toISOString(),
    }
    despesasRepository.save(merged)
    return merged
  },

  remove: (id: string): void => {
    despesasRepository.delete(id)
  },

  buildDashboard: (ano: number, mes: number): DashboardDespesas => {
    const list = aplicarRegrasAutomaticas()
    const ym = `${ano}-${String(mes).padStart(2, '0')}`
    const doMes = list.filter((d) => d.dataVencimento.slice(0, 7) === ym)
    const totalDespesasMes = doMes.reduce((s, d) => s + d.valor, 0)
    const totalPagoMes = doMes.filter((d) => d.status === 'pago').reduce((s, d) => s + d.valor, 0)
    const totalPendenteMes = doMes.filter((d) => d.status === 'pendente').reduce((s, d) => s + d.valor, 0)
    const totalAtrasadoMes = doMes.filter((d) => d.status === 'atrasado').reduce((s, d) => s + d.valor, 0)
    const custoFixoMensal = doMes.filter((d) => d.tipo === 'fixa').reduce((s, d) => s + d.valor, 0)
    const custoVariavelMensal = doMes.filter((d) => d.tipo === 'variavel').reduce((s, d) => s + d.valor, 0)

    const categorias = CATEGORIAS_DESPESA.map((categoria) => {
      const total = doMes.filter((d) => d.categoria === categoria).reduce((s, d) => s + d.valor, 0)
      const percentualDoTotal = totalDespesasMes > 0 ? (total / totalDespesasMes) * 100 : 0
      return {
        categoria,
        total,
        percentualDoTotal,
        alertaAcimaDe30: percentualDoTotal > 30,
      }
    })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)

    const ref = parseISO(`${ym}-01`)
    const ultimosTres = [1, 2, 3].map((n) => format(subMonths(ref, n), 'yyyy-MM'))
    const historico = ultimosTres.map((ymRef) => somarPorMes(list, ymRef)).filter((v) => v > 0)
    const mediaHistorico = historico.length > 0 ? historico.reduce((s, v) => s + v, 0) / historico.length : totalDespesasMes

    return {
      totalDespesasMes,
      totalPagoMes,
      totalPendenteMes,
      totalAtrasadoMes,
      custoFixoMensal,
      custoVariavelMensal,
      totalProjetadoProximoMes: mediaHistorico,
      categorias,
    }
  },

  getCompetenciaAtual: () => {
    const inicio = startOfMonth(new Date())
    return {
      ano: Number(format(inicio, 'yyyy')),
      mes: Number(format(inicio, 'MM')),
    }
  },
}
