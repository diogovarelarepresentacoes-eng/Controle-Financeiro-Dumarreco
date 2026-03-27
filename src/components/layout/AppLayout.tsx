import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeToggle } from '../ui/ThemeToggle'
import { ROTA_DESPESAS } from '../../modules/despesas/routes'
import { ROTA_COMPRAS } from '../../modules/compras/routes'
import { ROTA_CRM_ATENDIMENTO, ROTA_CRM_CONFIG, ROTA_CRM_INBOX, ROTA_CRM_KANBAN, ROTA_CRM_METAS } from '../../modules/crm/routes'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Landmark,
  ShoppingCart,
  FileText,
  Receipt,
  Briefcase,
  TrendingDown,
  Package,
  BarChart2,
  DollarSign,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Upload,
  RefreshCw,
  FileBarChart,
  Inbox,
  Kanban,
  Target,
  Bot,
  Sliders,
  CreditCard,
} from 'lucide-react'

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

  const avatarLetter = usuarioAtual ? usuarioAtual.charAt(0).toUpperCase() : 'U'

  const iconSize = 15

  const nav = (
    <nav className="sidebar-nav">
      <NavLink to="/" end onClick={() => setMobileMenuOpen(false)}>
        <LayoutDashboard size={iconSize} className="sidebar-nav-icon" />
        Dashboard
      </NavLink>

      <NavLink to="/contas-banco" onClick={() => setMobileMenuOpen(false)}>
        <Landmark size={iconSize} className="sidebar-nav-icon" />
        Conta Banco
      </NavLink>

      <NavLink to="/vendas" onClick={() => setMobileMenuOpen(false)}>
        <ShoppingCart size={iconSize} className="sidebar-nav-icon" />
        Controle de Vendas
      </NavLink>

      {/* Financeiro */}
      <div className={`sidebar-group ${financeiroAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuFinanceiroAberto((prev) => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={iconSize} className="sidebar-nav-icon" />
            Financeiro
          </span>
          {menuFinanceiroAberto
            ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
            : <ChevronRight size={13} style={{ opacity: 0.5 }} />}
        </button>
        {menuFinanceiroAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/boletos" onClick={() => setMobileMenuOpen(false)}>
              <Receipt size={13} className="sidebar-nav-icon" />
              Boletos
            </NavLink>
            <NavLink to="/baixa-boleto" onClick={() => setMobileMenuOpen(false)}>
              <FileText size={13} className="sidebar-nav-icon" />
              Baixa de Boleto
            </NavLink>
          </div>
        )}
      </div>

      <NavLink to={ROTA_COMPRAS} onClick={() => setMobileMenuOpen(false)}>
        <Briefcase size={iconSize} className="sidebar-nav-icon" />
        Compras
      </NavLink>

      <NavLink to={ROTA_DESPESAS} onClick={() => setMobileMenuOpen(false)}>
        <TrendingDown size={iconSize} className="sidebar-nav-icon" />
        Despesas
      </NavLink>

      {/* Cadastros */}
      <div className={`sidebar-group ${cadastrosAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuCadastrosAberto((prev) => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={iconSize} className="sidebar-nav-icon" />
            Cadastros
          </span>
          {menuCadastrosAberto
            ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
            : <ChevronRight size={13} style={{ opacity: 0.5 }} />}
        </button>
        {menuCadastrosAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/produtos" onClick={() => setMobileMenuOpen(false)}>
              <Package size={13} className="sidebar-nav-icon" />
              Produtos
            </NavLink>
            <NavLink to="/importar-produtos" onClick={() => setMobileMenuOpen(false)}>
              <Upload size={13} className="sidebar-nav-icon" />
              Importar Produtos
            </NavLink>
          </div>
        )}
      </div>

      {/* Estoque */}
      <div className={`sidebar-group ${estoqueAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuEstoqueAberto((prev) => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={iconSize} className="sidebar-nav-icon" />
            Estoque
          </span>
          {menuEstoqueAberto
            ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
            : <ChevronRight size={13} style={{ opacity: 0.5 }} />}
        </button>
        {menuEstoqueAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/atualizar-estoque" onClick={() => setMobileMenuOpen(false)}>
              <RefreshCw size={13} className="sidebar-nav-icon" />
              Atualizar Estoque
            </NavLink>
          </div>
        )}
      </div>

      {/* Relatórios */}
      <div className={`sidebar-group ${relatoriosAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuRelatoriosAberto((prev) => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={iconSize} className="sidebar-nav-icon" />
            Relatórios
          </span>
          {menuRelatoriosAberto
            ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
            : <ChevronRight size={13} style={{ opacity: 0.5 }} />}
        </button>
        {menuRelatoriosAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/relatorios/vendas" onClick={() => setMobileMenuOpen(false)}>
              <FileBarChart size={13} className="sidebar-nav-icon" />
              Rel. de Vendas
            </NavLink>
            <NavLink to="/relatorios/boletos-pagos" onClick={() => setMobileMenuOpen(false)}>
              <Receipt size={13} className="sidebar-nav-icon" />
              Rel. Boletos Pagos
            </NavLink>
          </div>
        )}
      </div>

      <NavLink to="/faturamento" onClick={() => setMobileMenuOpen(false)}>
        <DollarSign size={iconSize} className="sidebar-nav-icon" />
        Faturamento
      </NavLink>

      {/* CRM */}
      <div className={`sidebar-group ${crmAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuCrmAberto((prev) => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare size={iconSize} className="sidebar-nav-icon" />
            CRM WhatsApp
          </span>
          {menuCrmAberto
            ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
            : <ChevronRight size={13} style={{ opacity: 0.5 }} />}
        </button>
        {menuCrmAberto && (
          <div className="sidebar-submenu">
            <NavLink to={ROTA_CRM_INBOX} onClick={() => setMobileMenuOpen(false)}>
              <Inbox size={13} className="sidebar-nav-icon" />
              Inbox
            </NavLink>
            <NavLink to={ROTA_CRM_ATENDIMENTO} onClick={() => setMobileMenuOpen(false)}>
              <MessageSquare size={13} className="sidebar-nav-icon" />
              Atendimento
            </NavLink>
            <NavLink to={ROTA_CRM_KANBAN} onClick={() => setMobileMenuOpen(false)}>
              <Kanban size={13} className="sidebar-nav-icon" />
              Kanban
            </NavLink>
            <NavLink to={ROTA_CRM_METAS} onClick={() => setMobileMenuOpen(false)}>
              <Target size={13} className="sidebar-nav-icon" />
              Metas
            </NavLink>
            <NavLink to={ROTA_CRM_CONFIG} onClick={() => setMobileMenuOpen(false)}>
              <Bot size={13} className="sidebar-nav-icon" />
              Configurações IA
            </NavLink>
          </div>
        )}
      </div>

      {/* Configurações */}
      <div className={`sidebar-group ${configAtivo ? 'active' : ''}`}>
        <button
          type="button"
          className="sidebar-group-title sidebar-group-trigger"
          onClick={() => setMenuConfigAberto((prev) => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={iconSize} className="sidebar-nav-icon" />
            Configurações
          </span>
          {menuConfigAberto
            ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
            : <ChevronRight size={13} style={{ opacity: 0.5 }} />}
        </button>
        {menuConfigAberto && (
          <div className="sidebar-submenu">
            <NavLink to="/configuracoes" onClick={() => setMobileMenuOpen(false)}>
              <Sliders size={13} className="sidebar-nav-icon" />
              Geral
            </NavLink>
            <NavLink to="/configuracoes/maquinas-cartao" onClick={() => setMobileMenuOpen(false)}>
              <CreditCard size={13} className="sidebar-nav-icon" />
              Máquinas de Cartão
            </NavLink>
          </div>
        )}
      </div>
    </nav>
  )

  const sidebarFooter = (
    <div className="sidebar-footer">
      <div className="sidebar-avatar">{avatarLetter}</div>
      <div className="sidebar-user-info">
        <span className="sidebar-username">{usuarioAtual || 'Usuário'}</span>
        <span className="sidebar-role">Operador</span>
      </div>
      <button
        type="button"
        className="sidebar-logout-btn"
        title="Sair"
        onClick={() => { setMobileMenuOpen(false); logout() }}
      >
        <LogOut size={15} />
      </button>
    </div>
  )

  return (
    <div className="app">
      {/* Desktop sidebar */}
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-header sidebar-header--col">
          <div className="sidebar-brand">
            <div className="sidebar-brand-mark">CF</div>
            <div className="sidebar-brand-name">
              <span>Controle</span>
              <span>Dumarreco</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* Mobile topbar */}
      <header className="mobile-topbar no-print">
        <button
          className="mobile-menu-btn"
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          <Menu size={20} />
        </button>
        <div className="mobile-topbar-brand">
          <div className="sidebar-brand-mark" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>CF</div>
          Dumarreco
        </div>
        <ThemeToggle />
      </header>

      {/* Mobile sidebar */}
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
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="sidebar-header">
                <div className="sidebar-brand">
                  <div className="sidebar-brand-mark">CF</div>
                  <div className="sidebar-brand-name">
                    <span>Controle</span>
                    <span>Dumarreco</span>
                  </div>
                </div>
              </div>
              {nav}
              {sidebarFooter}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="main">{children}</main>
    </div>
  )
}
