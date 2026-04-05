import { Router } from 'express'
import { authController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(authController.login))
