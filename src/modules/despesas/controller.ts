import { despesasService } from './service'
import type { Despesa, FiltrosDespesas } from './model'

type CriarDespesaPayload = Omit<Despesa, 'id' | 'criadoEm' | 'atualizadoEm' | 'recorrenciaOrigemId'>
type AtualizarDespesaPayload = Partial<CriarDespesaPayload>

export const despesasController = {
  listar: (filtros?: FiltrosDespesas) => despesasService.list(filtros),
  detalhar: (id: string) => despesasService.getById(id),
  criar: (payload: CriarDespesaPayload) => despesasService.create(payload),
  atualizar: (id: string, payload: AtualizarDespesaPayload) => despesasService.update(id, payload),
  excluir: (id: string) => despesasService.remove(id),
  dashboardMensal: (ano: number, mes: number) => despesasService.buildDashboard(ano, mes),
  competenciaAtual: () => despesasService.getCompetenciaAtual(),
}
