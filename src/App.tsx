import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
import Compras from './pages/Compras'
import { ROTA_COMPRAS } from './modules/compras/routes'
import { AppLayout } from './components/layout/AppLayout'

function App() {
  const location = useLocation()
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contas-banco" element={<ContaBanco />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/boletos" element={<Boletos />} />
            <Route path={ROTA_COMPRAS} element={<Compras />} />
            <Route path="/baixa-boleto" element={<BaixaBoleto />} />
            <Route path={ROTA_DESPESAS} element={<Despesas />} />
            <Route path="/relatorios" element={<Navigate to="/relatorios/vendas" replace />} />
            <Route path="/relatorios/vendas" element={<RelatorioVendas />} />
            <Route path="/relatorios/boletos-pagos" element={<RelatorioBoletosPagos />} />
            <Route path="/faturamento" element={<Faturamento />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  )
}

export default App
