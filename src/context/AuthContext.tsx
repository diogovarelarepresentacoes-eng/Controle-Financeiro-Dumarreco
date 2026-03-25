import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { clearSessao, getSessao, setSessao, validarLogin } from '../services/authStorage'

interface AuthContextValue {
  isAuthenticated: boolean
  usuarioAtual: string | null
  login: (login: string, senha: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarioAtual, setUsuarioAtual] = useState<string | null>(() => getSessao())

  function login(login: string, senha: string): boolean {
    const usuario = validarLogin(login, senha)
    if (!usuario) return false
    setSessao(usuario.login)
    setUsuarioAtual(usuario.login)
    return true
  }

  function logout() {
    clearSessao()
    setUsuarioAtual(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: usuarioAtual !== null, usuarioAtual, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
