import { Router } from 'express'
import { migrationController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

export const migrationRouter = Router()

migrationRouter.post('/import-legacy', asyncHandler(migrationController.importLegacy))
