import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Lock, User, AlertCircle, TrendingUp, BarChart2, DollarSign } from 'lucide-react'

function fieldVariants(i: number): Variants {
  return {
    hidden:  { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08 + 0.15, duration: 0.35, ease: 'easeOut' } as const,
    },
  }
}

const SHAKE_VARIANTS: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -4, 4, 0],
    transition: { duration: 0.45 },
  },
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginVal, setLoginVal] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const ok = await login(loginVal, senha)
      if (ok) {
        navigate('/', { replace: true })
      } else {
        setErro('Login ou senha inválidos.')
        setShakeKey((k) => k + 1)
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Mesh atmosphere */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 60% at 20% 50%, rgba(0, 217, 160, 0.07) 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 80% 20%, rgba(0, 100, 200, 0.06) 0%, transparent 65%),
          radial-gradient(ellipse 40% 40% at 60% 90%, rgba(0, 217, 160, 0.04) 0%, transparent 65%)
        `,
      }} />

      {/* Left panel — brand */}
      <div style={{
        display: 'none',
        flex: '1',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        gap: '40px',
        borderRight: '1px solid var(--border)',
        position: 'relative',
        ...(typeof window !== 'undefined' && window.innerWidth >= 900 ? { display: 'flex' } : {}),
      }} className="login-brand-panel">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ textAlign: 'center' }}
        >
          <div style={{
            width: 72,
            height: 72,
            background: 'var(--primary)',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.6rem',
            color: '#060a0f',
            margin: '0 auto 20px',
            boxShadow: '0 0 40px var(--primary-glow)',
          }}>
            CF
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '2rem',
            letterSpacing: '-0.04em',
            color: 'var(--text)',
            marginBottom: 8,
          }}>
            Dumarreco
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 260, lineHeight: 1.6 }}>
            Central de comando financeiro — controle de caixa, vendas e estoque em tempo real.
          </p>
        </motion.div>

        {/* Feature list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 280 }}
        >
          {[
            { icon: <DollarSign size={16} />, label: 'Controle de caixa em tempo real' },
            { icon: <BarChart2 size={16} />, label: 'Relatórios e faturamento' },
            { icon: <TrendingUp size={16} />, label: 'CRM e gestão de vendas' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--primary-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              {item.label}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: '0 0 auto',
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        margin: '0 auto',
      }}>
        <motion.div
          key={shakeKey}
          variants={SHAKE_VARIANTS}
          animate={shakeKey > 0 ? 'shake' : undefined}
          style={{ width: '100%' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderTop: '2px solid var(--primary)',
              borderRadius: 16,
              padding: '36px 32px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Header */}
            <motion.div
              variants={fieldVariants(0)}
              initial="hidden"
              animate="visible"
              style={{ marginBottom: 32, textAlign: 'center' }}
            >
              <div style={{
                width: 48,
                height: 48,
                background: 'var(--primary)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1rem',
                color: '#060a0f',
                margin: '0 auto 16px',
              }}>
                CF
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.4rem',
                letterSpacing: '-0.03em',
                color: 'var(--text)',
                marginBottom: 6,
              }}>
                Bem-vindo de volta
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Acesse o painel financeiro Dumarreco
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Login field */}
              <motion.div
                variants={fieldVariants(1)}
                initial="hidden"
                animate="visible"
                className="form-group"
                style={{ marginBottom: 0 }}
              >
                <label htmlFor="login-field">Usuário</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    pointerEvents: 'none',
                  }}>
                    <User size={15} />
                  </span>
                  <input
                    id="login-field"
                    type="text"
                    autoComplete="username"
                    value={loginVal}
                    onChange={(e) => setLoginVal(e.target.value)}
                    required
                    autoFocus
                    placeholder="seu usuário"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div
                variants={fieldVariants(2)}
                initial="hidden"
                animate="visible"
                className="form-group"
                style={{ marginBottom: 0 }}
              >
                <label htmlFor="senha-field">Senha</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    pointerEvents: 'none',
                  }}>
                    <Lock size={15} />
                  </span>
                  <input
                    id="senha-field"
                    type="password"
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </motion.div>

              {/* Error */}
              <AnimatePresence mode="wait">
                {erro && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0, marginTop: -8 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(255, 71, 87, 0.08)',
                      border: '1px solid rgba(255, 71, 87, 0.35)',
                      color: 'var(--danger)',
                      fontSize: '0.83rem',
                      fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    {erro}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                variants={fieldVariants(3)}
                initial="hidden"
                animate="visible"
                type="submit"
                className="btn btn-primary"
                disabled={carregando}
                style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', marginTop: 4 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
              >
                {carregando ? (
                  <>
                    <span className="spinner" />
                    Entrando...
                  </>
                ) : 'Entrar'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .login-brand-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
