import { Router } from 'express'
import { despesasController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const despesasRouter = Router()

despesasRouter.get('/', asyncHandler(despesasController.list))
despesasRouter.post('/', asyncHandler(despesasController.create))
despesasRouter.put('/save-all', asyncHandler(despesasController.saveAll))
despesasRouter.get('/deleted-recurrence-markers', asyncHandler(despesasController.getDeletedRecurrenceMarkers))
despesasRouter.post('/deleted-recurrence-markers', asyncHandler(despesasController.addDeletedRecurrenceMarker))
despesasRouter.delete('/deleted-recurrence-markers/:origemId', asyncHandler(despesasController.clearDeletedRecurrenceMarkersByOrigem))
despesasRouter.get('/:id', asyncHandler(despesasController.getById))
despesasRouter.put('/:id', asyncHandler(despesasController.update))
despesasRouter.post('/:id/pagamento', asyncHandler(despesasController.registrarPagamento))
despesasRouter.post('/:id/reverter-pagamento', asyncHandler(despesasController.reverterPagamento))
despesasRouter.delete('/:id', asyncHandler(despesasController.remove))
