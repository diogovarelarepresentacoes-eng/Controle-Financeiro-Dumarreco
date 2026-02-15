import { comprasService } from './service'
import type { FiltrosCompra } from './model'

export const comprasController = {
  listar: (filtros?: FiltrosCompra) => comprasService.listar(filtros),
  detalhar: (id: string) => comprasService.detalhar(id),
  criarManual: comprasService.criarManual,
  importarXml: comprasService.importarXml,
  gerarContasPagarManual: comprasService.gerarContasPagarManual,
  excluirCompra: comprasService.excluirCompra,
  kpisMensais: comprasService.kpisMensais,
}
