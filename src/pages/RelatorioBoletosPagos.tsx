import { useMemo, useState } from 'react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { storageBoletos, storageContas } from '../services/storage'

export default function RelatorioBoletosPagos() {
  const hoje = new Date()
  const dataInicioPadrao = format(startOfMonth(hoje), 'yyyy-MM-dd')
  const dataFimPadrao = format(endOfMonth(hoje), 'yyyy-MM-dd')

  const [dataInicioBoletos, setDataInicioBoletos] = useState(dataInicioPadrao)
  const [dataFimBoletos, setDataFimBoletos] = useState(dataFimPadrao)

  const boletos = useMemo(() => storageBoletos.getAll(), [])
  const contas = useMemo(() => storageContas.getAll(), [])

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const nomeConta = (id: string) => contas.find((c) => c.id === id)?.nome ?? '-'

  const datasBoletosPreenchidas = Boolean(dataInicioBoletos && dataFimBoletos)
  const intervaloBoletosValido = datasBoletosPreenchidas && dataInicioBoletos <= dataFimBoletos

  const boletosPagosFiltrados = useMemo(() => {
    if (!intervaloBoletosValido) return []
    return boletos
      .filter((b) => b.pago && b.dataPagamento)
      .filter((b) => b.dataPagamento! >= dataInicioBoletos && b.dataPagamento! <= dataFimBoletos)
      .sort((a, b) => (a.dataPagamento ?? '').localeCompare(b.dataPagamento ?? ''))
  }, [boletos, dataInicioBoletos, dataFimBoletos, intervaloBoletosValido])

  const totalBoletosPagos = boletosPagosFiltrados.reduce((s, b) => s + b.valor, 0)

  const imprimir = () => {
    window.print()
  }

  return (
    <div className="relatorios-page">
      <h1 className="page-title no-print">Relatorio de Boletos Pagos</h1>
      <p className="no-print" style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Gere o relatorio apenas de boletos pagos no periodo desejado e use &quot;Imprimir / Salvar em PDF&quot;.
      </p>

      <div className="relatorio-botoes no-print" style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-primary" onClick={imprimir}>
          Imprimir / Salvar em PDF
        </button>
      </div>

      <section className="card relatorio-section">
        <h2 className="relatorio-titulo">Relatorio de Boletos Pagos</h2>
        <div className="no-print relatorio-filtros">
          <div className="form-row" style={{ alignItems: 'flex-end', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data inicial</label>
              <input
                type="date"
                value={dataInicioBoletos}
                onChange={(e) => setDataInicioBoletos(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data final</label>
              <input
                type="date"
                value={dataFimBoletos}
                onChange={(e) => setDataFimBoletos(e.target.value)}
              />
            </div>
          </div>
        </div>

        <p className="relatorio-periodo">
          Periodo (data do pagamento):{' '}
          {intervaloBoletosValido
            ? `${format(parseISO(dataInicioBoletos), 'dd/MM/yyyy', { locale: ptBR })} ate ${format(parseISO(dataFimBoletos), 'dd/MM/yyyy', { locale: ptBR })}`
            : 'intervalo invalido'}
        </p>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Boletos pagos por dia, com origem do pagamento (Banco ou Dinheiro).
        </p>
        {!intervaloBoletosValido && (
          <p style={{ color: 'var(--warning)', fontSize: '0.9rem', marginBottom: 12 }}>
            Preencha as duas datas e use um intervalo valido (inicial menor ou igual a final) para exibir os boletos.
          </p>
        )}

        <div className="table-wrap">
          <table className="relatorio-tabela">
            <thead>
              <tr>
                <th>Data do pagamento</th>
                <th>Descricao</th>
                <th>Valor</th>
                <th>Origem do pagamento</th>
                <th>Conta banco</th>
              </tr>
            </thead>
            <tbody>
              {boletosPagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    Nenhum boleto pago no periodo.
                  </td>
                </tr>
              ) : (
                boletosPagosFiltrados.map((b) => (
                  <tr key={b.id}>
                    <td>{b.dataPagamento ? format(parseISO(b.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                    <td>{b.descricao}</td>
                    <td>{formatMoney(b.valor)}</td>
                    <td>
                      {b.origemPagamento === 'conta_banco' ? 'Banco' : b.origemPagamento === 'dinheiro' ? 'Dinheiro' : '-'}
                    </td>
                    <td>{b.contaBancoId ? nomeConta(b.contaBancoId) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="relatorio-total">
          <strong>Total pago no periodo: {formatMoney(totalBoletosPagos)}</strong>
        </p>
      </section>

      <p className="relatorio-rodape" style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Controle Financeiro Dumarreco - Relatorio gerado em {format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}.
      </p>
    </div>
  )
}
