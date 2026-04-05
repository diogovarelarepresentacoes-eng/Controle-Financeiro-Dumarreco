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

  async listarUsuarios(_req: Request, res: Response) {
    return res.json(await authService.listarUsuarios())
  },

  async criarUsuario(req: Request, res: Response) {
    const { login, senha } = req.body ?? {}
    if (!login || !senha) {
      return res.status(400).json({ error: 'Login e senha sao obrigatorios.' })
    }
    try {
      const usuario = await authService.criarUsuario(login, senha)
      return res.status(201).json(usuario)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar usuario.' })
    }
  },

  async excluirUsuario(req: Request, res: Response) {
    try {
      await authService.excluirUsuario(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir usuario.' })
    }
  },

  async alterarSenha(req: Request, res: Response) {
    const { novaSenha } = req.body ?? {}
    if (!novaSenha) {
      return res.status(400).json({ error: 'Nova senha e obrigatoria.' })
    }
    try {
      await authService.alterarSenha(String(req.params.id), novaSenha)
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao alterar senha.' })
    }
  },
}
