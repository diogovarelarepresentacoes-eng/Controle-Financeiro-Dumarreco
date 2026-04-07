import { USING_BACKEND } from '../../services/apiHelper'
import { despesasGateway } from '../../services/despesasGateway'
import { despesasService as localService } from './service'
import type { DashboardDespesas, Despesa, FiltrosDespesas } from './model'
import { CATEGORIAS_DESPESA } from './model'
import { format, parseISO, startOfMonth, subMonths } from 'date-fns'

type CriarDespesaPayload = Omit<Despesa, 'id' | 'criadoEm' | 'atualizadoEm' | 'recorrenciaOrigemId'>
type AtualizarDespesaPayload = Partial<CriarDespesaPayload>

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

function buildDashboardFromList(list: Despesa[], ano: number, mes: number): DashboardDespesas {
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
    return { categoria, total, percentualDoTotal, alertaAcimaDe30: percentualDoTotal > 30 }
  })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const ref = parseISO(`${ym}-01`)
  const somarPorMes = (ymRef: string) =>
    list.filter((d) => d.dataVencimento.slice(0, 7) === ymRef).reduce((s, d) => s + d.valor, 0)
  const ultimosTres = [1, 2, 3].map((n) => format(subMonths(ref, n), 'yyyy-MM'))
  const historico = ultimosTres.map(somarPorMes).filter((v) => v > 0)
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
}

export const despesasController = {
  listar: async (filtros?: FiltrosDespesas): Promise<Despesa[]> => {
    if (USING_BACKEND) {
      const all = await despesasGateway.getAll()
      return filtrar(all, filtros).sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento))
    }
    return localService.list(filtros)
  },

  detalhar: async (id: string): Promise<Despesa | undefined> => {
    if (USING_BACKEND) return despesasGateway.getById(id)
    return localService.getById(id)
  },

  criar: async (payload: CriarDespesaPayload): Promise<Despesa> => {
    if (USING_BACKEND) {
      const now = new Date().toISOString()
      const despesa: Despesa = {
        ...payload,
        id: crypto.randomUUID(),
        recorrenciaOrigemId: undefined,
        criadoEm: now,
        atualizadoEm: now,
      }
      return despesasGateway.save(despesa)
    }
    return localService.create(payload)
  },

  atualizar: async (id: string, payload: AtualizarDespesaPayload): Promise<Despesa> => {
    if (USING_BACKEND) {
      const existing = await despesasGateway.getById(id)
      if (!existing) throw new Error('Despesa nao encontrada')
      const merged: Despesa = { ...existing, ...payload, atualizadoEm: new Date().toISOString() }
      return despesasGateway.save(merged)
    }
    return localService.update(id, payload)
  },

  excluir: async (id: string): Promise<void> => {
    if (USING_BACKEND) return despesasGateway.delete(id)
    localService.remove(id)
  },

  dashboardMensal: async (ano: number, mes: number): Promise<DashboardDespesas> => {
    if (USING_BACKEND) {
      const all = await despesasGateway.getAll()
      return buildDashboardFromList(all, ano, mes)
    }
    return localService.buildDashboard(ano, mes)
  },

  competenciaAtual: () => {
    const inicio = startOfMonth(new Date())
    return { ano: Number(format(inicio, 'yyyy')), mes: Number(format(inicio, 'MM')) }
  },
}
