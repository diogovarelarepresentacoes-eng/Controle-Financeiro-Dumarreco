import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { clearSessao, getSessao, setSessao, validarLogin } from '../services/authStorage'

interface AuthContextValue {
  isAuthenticated: boolean
  usuarioAtual: string | null
  login: (login: string, senha: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarioAtual, setUsuarioAtual] = useState<string | null>(() => getSessao())

  const login = useCallback(async (login: string, senha: string): Promise<boolean> => {
    const usuario = await validarLogin(login, senha)
    if (!usuario) return false
    setSessao(usuario.login)
    setUsuarioAtual(usuario.login)
    return true
  }, [])

  const logout = useCallback(() => {
    clearSessao()
    setUsuarioAtual(null)
  }, [])

  const value = useMemo(
    () => ({ isAuthenticated: usuarioAtual !== null, usuarioAtual, login, logout }),
    [usuarioAtual, login, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
