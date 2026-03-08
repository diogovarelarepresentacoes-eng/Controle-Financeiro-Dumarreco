import { Router } from 'express'
import { maquinasCartaoController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const maquinasCartaoRouter = Router()

maquinasCartaoRouter.get('/', asyncHandler(maquinasCartaoController.list))
maquinasCartaoRouter.post('/', asyncHandler(maquinasCartaoController.createMaquina))

maquinasCartaoRouter.get('/:id', asyncHandler(maquinasCartaoController.getById))
maquinasCartaoRouter.get('/:id/completo', asyncHandler(maquinasCartaoController.getByIdWithTaxas))
maquinasCartaoRouter.get('/:id/modalidade', asyncHandler(maquinasCartaoController.getByModalidade))
maquinasCartaoRouter.put('/:id', asyncHandler(maquinasCartaoController.updateMaquina))
maquinasCartaoRouter.patch('/:id/ativo', asyncHandler(maquinasCartaoController.toggleAtivo))
maquinasCartaoRouter.delete('/:id', asyncHandler(maquinasCartaoController.removeMaquina))

maquinasCartaoRouter.get('/:id/taxas', asyncHandler(maquinasCartaoController.listTaxas))
maquinasCartaoRouter.post('/:id/taxas', asyncHandler(maquinasCartaoController.createTaxa))
maquinasCartaoRouter.put('/:id/taxas/:taxaId', asyncHandler(maquinasCartaoController.updateTaxa))
maquinasCartaoRouter.delete('/:id/taxas/:taxaId', asyncHandler(maquinasCartaoController.removeTaxa))
