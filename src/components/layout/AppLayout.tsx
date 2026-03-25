import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeToggle } from '../ui/ThemeToggle'
import { ROTA_DESPESAS } from '../../modules/despesas/routes'
import { ROTA_COMPRAS } from '../../modules/compras/routes'
import { ROTA_CRM_ATENDIMENTO, ROTA_CRM_CONFIG, ROTA_CRM_INBOX, ROTA_CRM_KANBAN, ROTA_CRM_METAS } from '../../modules/crm/routes'
import { useAuth } from '../../context/AuthContext'

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { logout, usuarioAtual } = useAuth()

  const financeiroAtivo = location.pathname === '/boletos' || location.pathname === '/baixa-boleto'
  const relatoriosAtivo = location.pathname.startsWith('/relatorios')
  const cadastrosAtivo = location.pathname.startsWith('/produtos') || location.pathname.startsWith('/importar-produtos')
  const estoqueAtivo = location.pathname.startsWith('/atualizar-estoque')
  const crmAtivo = location.pathname.startsWith('/crm/')
  const configAtivo = location.pathname.startsWith('/configuracoes')
  const [menuFinanceiroAberto, setMenuFinanceiroAberto] = useState(financeiroAtivo)
  const [menuRelatoriosAberto, setMenuRelatoriosAberto] = useState(relatoriosAtivo)
  const [menuCadastrosAberto, setMenuCadastrosAberto] = useState(cadastrosAtivo)
  const [menuEstoqueAberto, setMenuEstoqueAberto] = useState(estoqueAtivo)
  const [menuCrmAberto, setMenuCrmAberto] = useState(crmAtivo)
  const [menuConfigAberto, setMenuConfigAberto] = useState(configAtivo)

  useEffect(() => {
    if (financeiroAtivo) setMenuFinanceiroAberto(true)
    if (relatoriosAtivo) setMenuRelatoriosAberto(true)
    if (cadastrosAtivo) setMenuCadastrosAberto(true)
    if (estoqueAtivo) setMenuEstoqueAberto(true)
    if (crmAtivo) setMenuCrmAberto(true)
    if (configAtivo) setMenuConfigAberto(true)
    setMobileMenuOpen(false)
  }, [location.pathname, financeiroAtivo, relatoriosAtivo, cadastrosAtivo, estoqueAtivo, crmAtivo, configAtivo])

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

      <div className={`sidebar-group ${cadastrosAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuCadastrosAberto((prev) => !prev)}
        >
          Cadastros <span>{menuCadastrosAberto ? '▾' : '▸'}</span>
        </button>
        {menuCadastrosAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/produtos" onClick={() => setMobileMenuOpen(false)}>Produtos</NavLink>
            <NavLink to="/importar-produtos" onClick={() => setMobileMenuOpen(false)}>Importar Produtos (Planilha)</NavLink>
          </div>
        )}
      </div>

      <div className={`sidebar-group ${estoqueAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuEstoqueAberto((prev) => !prev)}
        >
          Estoque <span>{menuEstoqueAberto ? '▾' : '▸'}</span>
        </button>
        {menuEstoqueAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/atualizar-estoque" onClick={() => setMobileMenuOpen(false)}>Atualizar Estoque (Planilha)</NavLink>
          </div>
        )}
      </div>

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
      <div className={`sidebar-group ${crmAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuCrmAberto((prev) => !prev)}
        >
          CRM WhatsApp <span>{menuCrmAberto ? '▾' : '▸'}</span>
        </button>
        {menuCrmAberto && (
          <div className="sidebar-submenu">
            <NavLink to={ROTA_CRM_INBOX} onClick={() => setMobileMenuOpen(false)}>Inbox</NavLink>
            <NavLink to={ROTA_CRM_ATENDIMENTO} onClick={() => setMobileMenuOpen(false)}>Atendimento</NavLink>
            <NavLink to={ROTA_CRM_KANBAN} onClick={() => setMobileMenuOpen(false)}>Kanban</NavLink>
            <NavLink to={ROTA_CRM_METAS} onClick={() => setMobileMenuOpen(false)}>Metas</NavLink>
            <NavLink to={ROTA_CRM_CONFIG} onClick={() => setMobileMenuOpen(false)}>Configurações IA</NavLink>
          </div>
        )}
      </div>
      <div className={`sidebar-group ${configAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuConfigAberto((prev) => !prev)}
        >
          Configuracoes <span>{menuConfigAberto ? '▾' : '▸'}</span>
        </button>
        {menuConfigAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/configuracoes" onClick={() => setMobileMenuOpen(false)}>Geral</NavLink>
            <NavLink to="/configuracoes/maquinas-cartao" onClick={() => setMobileMenuOpen(false)}>Maquinas de Cartao</NavLink>
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {usuarioAtual && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 4px' }}>
            {usuarioAtual}
          </span>
        )}
        <button
          type="button"
          className="btn btn-danger"
          style={{ width: '100%' }}
          onClick={() => { setMobileMenuOpen(false); logout() }}
        >
          Sair
        </button>
      </div>
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
          <>
            <button
              type="button"
              className="mobile-sidebar-backdrop no-print"
              aria-label="Fechar menu"
              onClick={() => setMobileMenuOpen(false)}
            />
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
          </>
        )}
      </AnimatePresence>

      <main className="main">{children}</main>
    </div>
  )
}
