import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="theme-toggle-pill" title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}>
      {/* Sliding thumb — ocupa metade do pill e desliza para a opção ativa */}
      <motion.div
        className="theme-toggle-thumb"
        animate={{ x: isDark ? '100%' : '0%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: 3,
          width: 'calc(50% - 3px)',
          borderRadius: 999,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Claro */}
      <button
        type="button"
        className={`theme-toggle-option ${!isDark ? 'active' : ''}`}
        onClick={() => isDark && toggleTheme()}
        aria-label="Modo claro"
      >
        <Sun size={12} />
        Claro
      </button>

      {/* Escuro */}
      <button
        type="button"
        className={`theme-toggle-option ${isDark ? 'active' : ''}`}
        onClick={() => !isDark && toggleTheme()}
        aria-label="Modo escuro"
      >
        <Moon size={12} />
        Escuro
      </button>
    </div>
  )
}
