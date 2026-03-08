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
import ConfiguracoesMaquinasCartao from './pages/ConfiguracoesMaquinasCartao'
import Despesas from './pages/Despesas'
import { ROTA_DESPESAS } from './modules/despesas/routes'
import Compras from './pages/Compras'
import { ROTA_COMPRAS } from './modules/compras/routes'
import { AppLayout } from './components/layout/AppLayout'
import Produtos from './pages/Produtos'
import ImportarProdutos from './pages/ImportarProdutos'
import AtualizarEstoque from './pages/AtualizarEstoque'
import CrmInbox from './pages/CrmInbox'
import CrmAtendimento from './pages/CrmAtendimento'
import CrmKanban from './pages/CrmKanban'
import CrmMetas from './pages/CrmMetas'
import CrmConfiguracoes from './pages/CrmConfiguracoes'
import { ROTA_CRM_ATENDIMENTO, ROTA_CRM_CONFIG, ROTA_CRM_INBOX, ROTA_CRM_KANBAN, ROTA_CRM_METAS } from './modules/crm/routes'

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
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/importar-produtos" element={<ImportarProdutos />} />
            <Route path="/atualizar-estoque" element={<AtualizarEstoque />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/configuracoes/taxas-cartao" element={<Navigate to="/configuracoes/maquinas-cartao" replace />} />
            <Route path="/configuracoes/maquinas-cartao" element={<ConfiguracoesMaquinasCartao />} />
            <Route path={ROTA_CRM_INBOX} element={<CrmInbox />} />
            <Route path={ROTA_CRM_ATENDIMENTO} element={<CrmAtendimento />} />
            <Route path={ROTA_CRM_KANBAN} element={<CrmKanban />} />
            <Route path={ROTA_CRM_METAS} element={<CrmMetas />} />
            <Route path={ROTA_CRM_CONFIG} element={<CrmConfiguracoes />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  )
}

export default App
