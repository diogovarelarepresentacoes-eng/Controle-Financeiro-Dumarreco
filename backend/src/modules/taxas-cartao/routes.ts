import { Router } from 'express'
import { taxasCartaoController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const taxasCartaoRouter = Router()

taxasCartaoRouter.get('/', asyncHandler(taxasCartaoController.list))
taxasCartaoRouter.get('/modalidade', asyncHandler(taxasCartaoController.getByModalidade))
taxasCartaoRouter.get('/:id', asyncHandler(taxasCartaoController.getById))
taxasCartaoRouter.post('/', asyncHandler(taxasCartaoController.create))
taxasCartaoRouter.put('/:id', asyncHandler(taxasCartaoController.update))
taxasCartaoRouter.patch('/:id/ativo', asyncHandler(taxasCartaoController.toggleAtivo))
taxasCartaoRouter.delete('/:id', asyncHandler(taxasCartaoController.remove))
