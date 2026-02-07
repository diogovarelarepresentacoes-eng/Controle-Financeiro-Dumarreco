import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ContaBanco from './pages/ContaBanco'
import Boletos from './pages/Boletos'
import BaixaBoleto from './pages/BaixaBoleto'
import Vendas from './pages/Vendas'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'

function App() {
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
          <NavLink to="/relatorios">Relatórios</NavLink>
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
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
