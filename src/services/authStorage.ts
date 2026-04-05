export interface Usuario {
  id: string
  login: string
  senha: string
  root: boolean
}

export async function hashSenha(senha: string): Promise<string> {
  const data = new TextEncoder().encode(senha)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const ROOT_LOGIN = import.meta.env.VITE_ADMIN_LOGIN ?? 'DumarrecoAdmin'
const ROOT_PASS = import.meta.env.VITE_ADMIN_PASS ?? ''

let rootHashCache: string | null = null
async function getRootHash(): Promise<string> {
  if (!rootHashCache) rootHashCache = await hashSenha(ROOT_PASS)
  return rootHashCache
}

function getRootUser(senhaHash: string): Usuario {
  return { id: 'root', login: ROOT_LOGIN, senha: senhaHash, root: true }
}

const CHAVE_USUARIOS = 'controle-financeiro-usuarios'
const CHAVE_SESSAO = 'controle-financeiro-sessao'

export async function getUsuarios(): Promise<Usuario[]> {
  try {
    const raw = localStorage.getItem(CHAVE_USUARIOS)
    const lista: Usuario[] = raw ? JSON.parse(raw) : []
    const root = getRootUser(await getRootHash())
    return [root, ...lista.filter((u) => u.id !== 'root')]
  } catch {
    return [getRootUser(await getRootHash())]
  }
}

function salvarLista(lista: Usuario[]): void {
  const semRoot = lista.filter((u) => u.id !== 'root')
  localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(semRoot))
}

export async function salvarUsuario(usuario: Omit<Usuario, 'id' | 'root'>): Promise<void> {
  const lista = await getUsuarios()
  const novo: Usuario = {
    id: crypto.randomUUID(),
    login: usuario.login.trim(),
    senha: await hashSenha(usuario.senha),
    root: false,
  }
  salvarLista([...lista, novo])
}

export async function excluirUsuario(id: string): Promise<void> {
  if (id === 'root') return
  const lista = (await getUsuarios()).filter((u) => u.id !== id)
  salvarLista(lista)
}

export async function alterarSenha(id: string, novaSenha: string): Promise<void> {
  const hash = await hashSenha(novaSenha)
  const lista = (await getUsuarios()).map((u) => (u.id === id ? { ...u, senha: hash } : u))
  salvarLista(lista)
}

export async function validarLogin(login: string, senha: string): Promise<Usuario | null> {
  const hash = await hashSenha(senha)
  const usuario = (await getUsuarios()).find(
    (u) => u.login === login.trim() && u.senha === hash,
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
