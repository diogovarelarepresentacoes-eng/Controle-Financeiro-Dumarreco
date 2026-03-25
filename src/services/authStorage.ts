export interface Usuario {
  id: string
  login: string
  senha: string
  root: boolean
}

const ROOT: Usuario = { id: 'root', login: 'DumarrecoAdmin', senha: '@Duma2018', root: true }

const CHAVE_USUARIOS = 'controle-financeiro-usuarios'
const CHAVE_SESSAO = 'controle-financeiro-sessao'

export function getUsuarios(): Usuario[] {
  try {
    const raw = localStorage.getItem(CHAVE_USUARIOS)
    const lista: Usuario[] = raw ? JSON.parse(raw) : []
    return [ROOT, ...lista.filter((u) => u.id !== 'root')]
  } catch {
    return [ROOT]
  }
}

function salvarLista(lista: Usuario[]): void {
  const semRoot = lista.filter((u) => u.id !== 'root')
  localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(semRoot))
}

export function salvarUsuario(usuario: Omit<Usuario, 'id' | 'root'>): void {
  const lista = getUsuarios()
  const novo: Usuario = {
    id: crypto.randomUUID(),
    login: usuario.login.trim(),
    senha: usuario.senha,
    root: false,
  }
  salvarLista([...lista, novo])
}

export function excluirUsuario(id: string): void {
  if (id === 'root') return
  const lista = getUsuarios().filter((u) => u.id !== id)
  salvarLista(lista)
}

export function alterarSenha(id: string, novaSenha: string): void {
  const lista = getUsuarios().map((u) => (u.id === id ? { ...u, senha: novaSenha } : u))
  salvarLista(lista)
}

export function validarLogin(login: string, senha: string): Usuario | null {
  const usuario = getUsuarios().find(
    (u) => u.login === login.trim() && u.senha === senha,
  )
  return usuario ?? null
}

export function getSessao(): string | null {
  return localStorage.getItem(CHAVE_SESSAO)
}

export function setSessao(login: string): void {
  localStorage.setItem(CHAVE_SESSAO, login)
}

export function clearSessao(): void {
  localStorage.removeItem(CHAVE_SESSAO)
}
