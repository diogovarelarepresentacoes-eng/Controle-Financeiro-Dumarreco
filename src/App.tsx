import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ContaBanco from './pages/ContaBanco'
import Boletos from './pages/Boletos'
import BaixaBoleto from './pages/BaixaBoleto'
import Vendas from './pages/Vendas'
import RelatorioVendas from './pages/RelatorioVendas'
import RelatorioBoletosPagos from './pages/RelatorioBoletosPagos'
import Faturamento from './pages/Faturamento'
import Configuracoes from './pages/Configuracoes'
import Despesas from './pages/Despesas'
import { ROTA_DESPESAS } from './modules/despesas/routes'

function App() {
  const location = useLocation()
  const relatoriosAtivo = location.pathname.startsWith('/relatorios')

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <strong>Controle Financeiro Dumarreco</strong>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/contas-banco">Conta Banco</NavLink>
          <NavLink to="/vendas">Controle de Vendas</NavLink>
          <NavLink to="/boletos">Boletos</NavLink>
          <NavLink to="/baixa-boleto">Baixa de Boleto</NavLink>
          <NavLink to={ROTA_DESPESAS}>Despesas</NavLink>
          <div className={`sidebar-group ${relatoriosAtivo ? 'active' : ''}`}>
            <span className="sidebar-group-title">Relatórios</span>
            <div className="sidebar-submenu">
              <NavLink to="/relatorios/vendas">Relatório de Vendas</NavLink>
              <NavLink to="/relatorios/boletos-pagos">Relatório de Boletos Pagos</NavLink>
            </div>
          </div>
          <NavLink to="/faturamento">Faturamento</NavLink>
          <NavLink to="/configuracoes">Configurações</NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contas-banco" element={<ContaBanco />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/boletos" element={<Boletos />} />
          <Route path="/baixa-boleto" element={<BaixaBoleto />} />
          <Route path={ROTA_DESPESAS} element={<Despesas />} />
          <Route path="/relatorios" element={<Navigate to="/relatorios/vendas" replace />} />
          <Route path="/relatorios/vendas" element={<RelatorioVendas />} />
          <Route path="/relatorios/boletos-pagos" element={<RelatorioBoletosPagos />} />
          <Route path="/faturamento" element={<Faturamento />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
