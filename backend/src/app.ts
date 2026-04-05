import cors from 'cors'
import express from 'express'
import { purchasesRouter } from './modules/purchases/routes'
import { importJobsRouter, productsRouter, stockRouter } from './modules/products/routes'
import { maquinasCartaoRouter } from './modules/maquinas-cartao/routes'
import { contasBancoRouter } from './modules/contas-banco/routes'
import { boletosRouter } from './modules/boletos/routes'
import { movimentacoesRouter } from './modules/movimentacoes/routes'
import { vendasRouter } from './modules/vendas/routes'
import { faturamentoMensalRouter } from './modules/faturamento-mensal/routes'
import { despesasRouter } from './modules/despesas/routes'
import { migrationRouter } from './modules/migration/routes'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '15mb' }))

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api/purchases', purchasesRouter)
  app.use('/api/products', productsRouter)
  app.use('/api/stock', stockRouter)
  app.use('/api/import-jobs', importJobsRouter)
  app.use('/api/maquinas-cartao', maquinasCartaoRouter)
  app.use('/api/contas-banco', contasBancoRouter)
  app.use('/api/boletos', boletosRouter)
  app.use('/api/movimentacoes', movimentacoesRouter)
  app.use('/api/vendas', vendasRouter)
  app.use('/api/faturamento-mensal', faturamentoMensalRouter)
  app.use('/api/despesas', despesasRouter)
  app.use('/api/migration', migrationRouter)

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Erro interno.'
    res.status(500).json({ error: message })
  })

  return app
}
