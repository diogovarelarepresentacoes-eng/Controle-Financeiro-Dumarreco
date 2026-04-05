import { Router } from 'express'
import { vendasController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const vendasRouter = Router()

vendasRouter.get('/', asyncHandler(vendasController.list))
vendasRouter.post('/', asyncHandler(vendasController.registrar))
vendasRouter.get('/:id', asyncHandler(vendasController.getById))
vendasRouter.put('/:id', asyncHandler(vendasController.atualizar))
vendasRouter.delete('/:id', asyncHandler(vendasController.excluir))
