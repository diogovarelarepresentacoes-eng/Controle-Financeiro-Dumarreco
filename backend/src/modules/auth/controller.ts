import type { Request, Response } from 'express'
import { authService } from './service'

export const authController = {
  async login(req: Request, res: Response) {
    const { login, senha } = req.body ?? {}
    if (!login || !senha) {
      return res.status(400).json({ error: 'Login e senha sao obrigatorios.' })
    }
    const usuario = await authService.validarLogin(login, senha)
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais invalidas.' })
    }
    return res.json(usuario)
  },
}
