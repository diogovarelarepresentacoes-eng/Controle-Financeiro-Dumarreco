import { Router } from 'express'
import { authController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(authController.login))
authRouter.get('/usuarios', asyncHandler(authController.listarUsuarios))
authRouter.post('/usuarios', asyncHandler(authController.criarUsuario))
authRouter.delete('/usuarios/:id', asyncHandler(authController.excluirUsuario))
authRouter.put('/usuarios/:id/senha', asyncHandler(authController.alterarSenha))
