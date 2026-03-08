import { Router } from 'express'
import { purchasesController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const purchasesRouter = Router()

purchasesRouter.get('/', asyncHandler(purchasesController.list))
purchasesRouter.get('/:id', asyncHandler(purchasesController.getById))
purchasesRouter.post('/manual', asyncHandler(purchasesController.createManual))
purchasesRouter.post('/import-xml', asyncHandler(purchasesController.importXml))
purchasesRouter.post('/:id/generate-payables', asyncHandler(purchasesController.generatePayables))
purchasesRouter.delete('/:id', asyncHandler(purchasesController.remove))
