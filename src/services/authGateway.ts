import { USING_BACKEND, request } from './apiHelper'
import { validarLogin as validarLoginLocal } from './authStorage'

interface LoginResult {
  id: string
  login: string
  root: boolean
}

export const authGateway = {
  usingBackend: USING_BACKEND,

  async login(login: string, senha: string): Promise<LoginResult | null> {
    if (USING_BACKEND) {
      try {
        return await request<LoginResult>('/api/auth/login', {
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
}
