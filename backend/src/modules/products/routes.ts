import { Router } from 'express'
import multer from 'multer'
import { productsController } from './controller'
import { asyncHandler } from '../../lib/asyncHandler'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } })

export const productsRouter = Router()
export const stockRouter = Router()
export const importJobsRouter = Router()

productsRouter.get('/', asyncHandler(productsController.list))
productsRouter.get('/search', asyncHandler(productsController.search))
productsRouter.get('/stock/batch', asyncHandler(productsController.stockBatch))
productsRouter.get('/:id', asyncHandler(productsController.getById))
productsRouter.post('/', asyncHandler(productsController.create))
productsRouter.put('/:id', asyncHandler(productsController.update))
productsRouter.patch('/:id/activate', asyncHandler(productsController.activate))
productsRouter.post('/import/preview', upload.single('file'), asyncHandler(productsController.previewImport))
productsRouter.post('/import', upload.single('file'), asyncHandler(productsController.importProducts))

stockRouter.post('/import/preview', upload.single('file'), asyncHandler(productsController.previewImport))
stockRouter.post('/import', upload.single('file'), asyncHandler(productsController.importStock))

importJobsRouter.get('/', asyncHandler(productsController.listImportJobs))
importJobsRouter.get('/:id', asyncHandler(productsController.getImportJob))
importJobsRouter.get('/:id/errors/export', asyncHandler(productsController.exportImportErrors))
