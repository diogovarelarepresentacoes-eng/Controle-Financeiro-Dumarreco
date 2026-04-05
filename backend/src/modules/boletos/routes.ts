import { Router } from 'express'
import { boletosController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const boletosRouter = Router()

boletosRouter.get('/', asyncHandler(boletosController.list))
boletosRouter.get('/pendentes', asyncHandler(boletosController.getPendentes))
boletosRouter.get('/pagos', asyncHandler(boletosController.getPagos))
boletosRouter.post('/', asyncHandler(boletosController.create))
boletosRouter.put('/save-all', asyncHandler(boletosController.saveAll))
boletosRouter.get('/:id', asyncHandler(boletosController.getById))
boletosRouter.put('/:id', asyncHandler(boletosController.update))
boletosRouter.post('/:id/baixa', asyncHandler(boletosController.registrarBaixa))
boletosRouter.post('/:id/reverter', asyncHandler(boletosController.reverterBaixa))
boletosRouter.delete('/:id', asyncHandler(boletosController.remove))
