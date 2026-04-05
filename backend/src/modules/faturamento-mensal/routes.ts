import { Router } from 'express'
import { faturamentoMensalController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const faturamentoMensalRouter = Router()

faturamentoMensalRouter.get('/', asyncHandler(faturamentoMensalController.list))
faturamentoMensalRouter.post('/', asyncHandler(faturamentoMensalController.save))
faturamentoMensalRouter.get('/:ano/:mes', asyncHandler(faturamentoMensalController.getByAnoMes))
faturamentoMensalRouter.delete('/:id', asyncHandler(faturamentoMensalController.remove))
