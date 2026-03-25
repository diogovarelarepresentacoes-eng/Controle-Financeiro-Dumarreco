import { useState } from 'react'
import { zerarBancoDeDados } from '../services/storage'
import {
  getUsuarios,
  salvarUsuario,
  excluirUsuario,
  alterarSenha,
  type Usuario,
} from '../services/authStorage'

export default function Configuracoes() {
  const [confirmando, setConfirmando] = useState(false)

  // Usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => getUsuarios())
  const [novoLogin, setNovoLogin] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [erroNovo, setErroNovo] = useState('')

  const [alterandoSenhaId, setAlterandoSenhaId] = useState<string | null>(null)
  const [senhaAlterada, setSenhaAlterada] = useState('')
  const [erroAlteracao, setErroAlteracao] = useState('')

  const recarregar = () => setUsuarios(getUsuarios())

  const zerar = () => {
    zerarBancoDeDados()
    window.location.reload()
  }

  function handleAdicionarUsuario(e: React.FormEvent) {
    e.preventDefault()
    setErroNovo('')
    if (!novoLogin.trim()) { setErroNovo('Informe um login.'); return }
    if (!novaSenha) { setErroNovo('Informe uma senha.'); return }
    const loginExiste = usuarios.some((u) => u.login.toLowerCase() === novoLogin.trim().toLowerCase())
    if (loginExiste) { setErroNovo('Já existe um usuário com este login.'); return }
    salvarUsuario({ login: novoLogin, senha: novaSenha })
    setNovoLogin('')
    setNovaSenha('')
    recarregar()
  }

  function handleExcluir(id: string) {
    excluirUsuario(id)
    recarregar()
  }

  function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroAlteracao('')
    if (!senhaAlterada) { setErroAlteracao('Informe a nova senha.'); return }
    if (alterandoSenhaId) {
      alterarSenha(alterandoSenhaId, senhaAlterada)
      setAlterandoSenhaId(null)
      setSenhaAlterada('')
      recarregar()
    }
  }

  return (
    <div>
      <h1 className="page-title">Configurações</h1>

      {/* Gerenciar Usuários */}
      <div className="card" style={{ maxWidth: 600, marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Gerenciar Usuários</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Login</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Perfil</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }} />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>{u.login}</td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>
                  {u.root && (
                    <span style={{
                      background: 'var(--primary, #3182ce)',
                      color: '#fff',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      Root
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    onClick={() => { setAlterandoSenhaId(u.id); setSenhaAlterada(''); setErroAlteracao('') }}
                  >
                    Alterar senha
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    disabled={u.root}
                    onClick={() => handleExcluir(u.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {alterandoSenhaId && (
          <form onSubmit={handleAlterarSenha} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, padding: 12, background: 'var(--bg-subtle, var(--bg))', borderRadius: 8, border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '0.9rem' }}>
              Alterar senha de: {usuarios.find((u) => u.id === alterandoSenhaId)?.login}
            </strong>
            <input
              className="input"
              type="password"
              placeholder="Nova senha"
              value={senhaAlterada}
              onChange={(e) => setSenhaAlterada(e.target.value)}
              autoFocus
            />
            {erroAlteracao && <p style={{ color: 'var(--danger, #e53e3e)', fontSize: '0.85rem', margin: 0 }}>{erroAlteracao}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Salvar</button>
              <button type="button" className="btn" style={{ fontSize: '0.85rem' }} onClick={() => setAlterandoSenhaId(null)}>Cancelar</button>
            </div>
          </form>
        )}

        <form onSubmit={handleAdicionarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong style={{ fontSize: '0.9rem' }}>Adicionar usuário</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="input"
              type="text"
              placeholder="Login"
              value={novoLogin}
              onChange={(e) => setNovoLogin(e.target.value)}
              style={{ flex: 1, minWidth: 120 }}
            />
            <input
              className="input"
              type="password"
              placeholder="Senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              style={{ flex: 1, minWidth: 120 }}
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Adicionar
            </button>
          </div>
          {erroNovo && <p style={{ color: 'var(--danger, #e53e3e)', fontSize: '0.85rem', margin: 0 }}>{erroNovo}</p>}
        </form>
      </div>

      {/* Zerar banco de dados */}
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
