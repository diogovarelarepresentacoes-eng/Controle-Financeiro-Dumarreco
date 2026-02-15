import { useTheme } from '../../context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button type="button" className="btn btn-secondary theme-toggle" onClick={toggleTheme}>
      {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
    </button>
  )
}
