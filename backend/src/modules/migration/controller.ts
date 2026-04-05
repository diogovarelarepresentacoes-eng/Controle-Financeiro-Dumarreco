import type { Request, Response } from 'express'
import { migrationService } from './service'

export const migrationController = {
  async importLegacy(req: Request, res: Response) {
    try {
      const result = await migrationService.importLegacy(req.body)
      return res.json(result)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha na importacao.' })
    }
  },
}
