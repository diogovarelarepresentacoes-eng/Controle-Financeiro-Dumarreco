import { Router } from 'express'
import { purchasesController } from './controller'

export const purchasesRouter = Router()

purchasesRouter.get('/', purchasesController.list)
purchasesRouter.get('/:id', purchasesController.getById)
purchasesRouter.post('/manual', purchasesController.createManual)
purchasesRouter.post('/import-xml', purchasesController.importXml)
purchasesRouter.post('/:id/generate-payables', purchasesController.generatePayables)
purchasesRouter.delete('/:id', purchasesController.remove)
