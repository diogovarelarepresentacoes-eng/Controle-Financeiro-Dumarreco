import { Router } from 'express'
import { movimentacoesController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const movimentacoesRouter = Router()

movimentacoesRouter.get('/', asyncHandler(movimentacoesController.list))
movimentacoesRouter.post('/', asyncHandler(movimentacoesController.create))
movimentacoesRouter.get('/conta/:contaBancoId', asyncHandler(movimentacoesController.getByConta))
movimentacoesRouter.get('/venda/:vendaId', asyncHandler(movimentacoesController.getByVenda))
movimentacoesRouter.delete('/:id', asyncHandler(movimentacoesController.remove))
