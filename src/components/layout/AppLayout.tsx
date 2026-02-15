import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeToggle } from '../ui/ThemeToggle'
import { ROTA_DESPESAS } from '../../modules/despesas/routes'
import { ROTA_COMPRAS } from '../../modules/compras/routes'

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [menuFinanceiroAberto, setMenuFinanceiroAberto] = useState(false)
  const [menuRelatoriosAberto, setMenuRelatoriosAberto] = useState(false)

  const financeiroAtivo = location.pathname === '/boletos' || location.pathname === '/baixa-boleto'
  const relatoriosAtivo = location.pathname.startsWith('/relatorios')

  const nav = (
    <nav className="sidebar-nav">
      <NavLink to="/" end onClick={() => setMobileMenuOpen(false)}>Dashboard</NavLink>
      <NavLink to="/contas-banco" onClick={() => setMobileMenuOpen(false)}>Conta Banco</NavLink>
      <NavLink to="/vendas" onClick={() => setMobileMenuOpen(false)}>Controle de Vendas</NavLink>

      <div className={`sidebar-group ${financeiroAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuFinanceiroAberto((prev) => !prev)}
        >
          Financeiro <span>{menuFinanceiroAberto ? '▾' : '▸'}</span>
        </button>
        {menuFinanceiroAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/boletos" onClick={() => setMobileMenuOpen(false)}>Boletos</NavLink>
            <NavLink to="/baixa-boleto" onClick={() => setMobileMenuOpen(false)}>Baixa de Boleto</NavLink>
          </div>
        )}
      </div>

      <NavLink to={ROTA_COMPRAS} onClick={() => setMobileMenuOpen(false)}>Compras</NavLink>
      <NavLink to={ROTA_DESPESAS} onClick={() => setMobileMenuOpen(false)}>Despesas</NavLink>

      <div className={`sidebar-group ${relatoriosAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuRelatoriosAberto((prev) => !prev)}
        >
          Relatorios <span>{menuRelatoriosAberto ? '▾' : '▸'}</span>
        </button>
        {menuRelatoriosAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/relatorios/vendas" onClick={() => setMobileMenuOpen(false)}>Relatorio de Vendas</NavLink>
            <NavLink to="/relatorios/boletos-pagos" onClick={() => setMobileMenuOpen(false)}>Relatorio de Boletos Pagos</NavLink>
          </div>
        )}
      </div>

      <NavLink to="/faturamento" onClick={() => setMobileMenuOpen(false)}>Faturamento</NavLink>
      <NavLink to="/configuracoes" onClick={() => setMobileMenuOpen(false)}>Configuracoes</NavLink>
    </nav>
  )

  return (
    <div className="app">
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-header">
          <strong>Controle Financeiro Dumarreco</strong>
          <ThemeToggle />
        </div>
        {nav}
      </aside>

      <header className="mobile-topbar no-print">
        <button className="btn btn-secondary" type="button" onClick={() => setMobileMenuOpen((v) => !v)}>
          Menu
        </button>
        <strong>Controle Financeiro</strong>
        <ThemeToggle />
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            className="sidebar mobile-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sidebar-header">
              <strong>Navegacao</strong>
            </div>
            {nav}
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="main">{children}</main>
    </div>
  )
}
