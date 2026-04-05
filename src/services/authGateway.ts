import { USING_BACKEND, request } from './apiHelper'
import {
  validarLogin as validarLoginLocal,
  getUsuarios as getUsuariosLocal,
  salvarUsuario as salvarUsuarioLocal,
  excluirUsuario as excluirUsuarioLocal,
  alterarSenha as alterarSenhaLocal,
} from './authStorage'

interface UsuarioResult {
  id: string
  login: string
  root: boolean
}

export const authGateway = {
  usingBackend: USING_BACKEND,

  async login(login: string, senha: string): Promise<UsuarioResult | null> {
    if (USING_BACKEND) {
      try {
        return await request<UsuarioResult>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ login, senha }),
        })
      } catch {
        return null
      }
    }
    const usuario = await validarLoginLocal(login, senha)
    if (!usuario) return null
    return { id: usuario.id, login: usuario.login, root: usuario.root }
  },

  async getUsuarios(): Promise<UsuarioResult[]> {
    if (USING_BACKEND) return request<UsuarioResult[]>('/api/auth/usuarios')
    const lista = await getUsuariosLocal()
    return lista.map((u) => ({ id: u.id, login: u.login, root: u.root }))
  },

  async salvarUsuario(login: string, senha: string): Promise<void> {
    if (USING_BACKEND) {
      await request('/api/auth/usuarios', {
        method: 'POST',
        body: JSON.stringify({ login, senha }),
      })
      return
    }
    await salvarUsuarioLocal({ login, senha })
  },

  async excluirUsuario(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/auth/usuarios/${id}`, { method: 'DELETE' })
      return
    }
    await excluirUsuarioLocal(id)
  },

  async alterarSenha(id: string, novaSenha: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/auth/usuarios/${id}/senha`, {
        method: 'PUT',
        body: JSON.stringify({ novaSenha }),
      })
      return
    }
    await alterarSenhaLocal(id, novaSenha)
  },
}
