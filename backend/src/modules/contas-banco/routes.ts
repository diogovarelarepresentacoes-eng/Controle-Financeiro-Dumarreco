import { Router } from 'express'
import { contasBancoController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const contasBancoRouter = Router()

contasBancoRouter.get('/', asyncHandler(contasBancoController.list))
contasBancoRouter.post('/', asyncHandler(contasBancoController.create))
contasBancoRouter.get('/:id', asyncHandler(contasBancoController.getById))
contasBancoRouter.put('/:id', asyncHandler(contasBancoController.update))
contasBancoRouter.delete('/:id', asyncHandler(contasBancoController.remove))
