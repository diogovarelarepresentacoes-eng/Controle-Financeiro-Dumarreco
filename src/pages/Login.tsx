import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginVal, setLoginVal] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const ok = login(loginVal, senha)
    setCarregando(false)
    if (ok) {
      navigate('/', { replace: true })
    } else {
      setErro('Login ou senha inválidos.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 4, textAlign: 'center' }}>
          Controle Financeiro
        </h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24, fontSize: '0.875rem' }}>
          Dumarreco
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label" htmlFor="login-field">Login</label>
            <input
              id="login-field"
              className="input"
              type="text"
              autoComplete="username"
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="senha-field">Senha</label>
            <input
              id="senha-field"
              className="input"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && (
            <p style={{ color: 'var(--danger, #e53e3e)', fontSize: '0.875rem', margin: 0 }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={carregando}
            style={{ marginTop: 4 }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
