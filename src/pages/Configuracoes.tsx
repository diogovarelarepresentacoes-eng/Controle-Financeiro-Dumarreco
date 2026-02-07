import { useState } from 'react'
import { zerarBancoDeDados } from '../services/storage'

export default function Configuracoes() {
  const [confirmando, setConfirmando] = useState(false)

  const zerar = () => {
    zerarBancoDeDados()
    window.location.reload()
  }

  return (
    <div>
      <h1 className="page-title">Configurações</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ marginBottom: 8 }}>Zerar banco de dados</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          Remove todos os dados do sistema: contas bancárias, boletos, movimentações e vendas.
          Use para começar a usar o sistema sem informações de teste. Esta ação não pode ser desfeita.
        </p>
        {!confirmando ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmando(true)}
          >
            Zerar todos os dados
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--warning)' }}>Tem certeza?</span>
            <button type="button" className="btn btn-danger" onClick={zerar}>
              Sim, zerar tudo
            </button>
            <button type="button" className="btn" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
