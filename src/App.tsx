import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ROTA_DESPESAS } from './modules/despesas/routes'
import { ROTA_COMPRAS } from './modules/compras/routes'
import { AppLayout } from './components/layout/AppLayout'
import { ROTA_CRM_ATENDIMENTO, ROTA_CRM_CONFIG, ROTA_CRM_INBOX, ROTA_CRM_KANBAN, ROTA_CRM_METAS } from './modules/crm/routes'
import { useAuth } from './context/AuthContext'
import type { ReactNode } from 'react'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ContaBanco = lazy(() => import('./pages/ContaBanco'))
const Boletos = lazy(() => import('./pages/Boletos'))
const BaixaBoleto = lazy(() => import('./pages/BaixaBoleto'))
const Vendas = lazy(() => import('./pages/Vendas'))
const RelatorioVendas = lazy(() => import('./pages/RelatorioVendas'))
const RelatorioBoletosPagos = lazy(() => import('./pages/RelatorioBoletosPagos'))
const Faturamento = lazy(() => import('./pages/Faturamento'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const ConfiguracoesMaquinasCartao = lazy(() => import('./pages/ConfiguracoesMaquinasCartao'))
const Despesas = lazy(() => import('./pages/Despesas'))
const Compras = lazy(() => import('./pages/Compras'))
const Produtos = lazy(() => import('./pages/Produtos'))
const ImportarProdutos = lazy(() => import('./pages/ImportarProdutos'))
const AtualizarEstoque = lazy(() => import('./pages/AtualizarEstoque'))
const CrmInbox = lazy(() => import('./pages/CrmInbox'))
const CrmAtendimento = lazy(() => import('./pages/CrmAtendimento'))
const CrmKanban = lazy(() => import('./pages/CrmKanban'))
const CrmMetas = lazy(() => import('./pages/CrmMetas'))
const CrmConfiguracoes = lazy(() => import('./pages/CrmConfiguracoes'))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  const location = useLocation()
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Carregando…</div>}>
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Suspense fallback={null}>
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
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}

export default App
