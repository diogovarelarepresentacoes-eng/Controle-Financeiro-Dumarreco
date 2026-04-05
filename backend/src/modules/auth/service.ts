import { createHash } from 'node:crypto'
import { prisma } from '../../infra/prismaClient'

function hashSenha(senha: string): string {
  return createHash('sha256').update(senha).digest('hex')
}

export const authService = {
  async validarLogin(login: string, senha: string) {
    const hash = hashSenha(senha)
    const usuario = await prisma.usuario.findFirst({
      where: { login: login.trim(), senhaHash: hash },
    })
    if (!usuario) return null
    return { id: usuario.id, login: usuario.login, root: usuario.root }
  },

  async listarUsuarios() {
    const rows = await prisma.usuario.findMany({ orderBy: { criadoEm: 'asc' } })
    return rows.map((u) => ({ id: u.id, login: u.login, root: u.root }))
  },

  async criarUsuario(login: string, senha: string) {
    const exists = await prisma.usuario.findUnique({ where: { login: login.trim() } })
    if (exists) throw new Error('Já existe um usuário com este login.')
    const usuario = await prisma.usuario.create({
      data: { login: login.trim(), senhaHash: hashSenha(senha), root: false },
    })
    return { id: usuario.id, login: usuario.login, root: usuario.root }
  },

  async excluirUsuario(id: string) {
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) throw new Error('Usuário não encontrado.')
    if (usuario.root) throw new Error('Não é possível excluir o usuário root.')
    await prisma.usuario.delete({ where: { id } })
  },

  async alterarSenha(id: string, novaSenha: string) {
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) throw new Error('Usuário não encontrado.')
    await prisma.usuario.update({
      where: { id },
      data: { senhaHash: hashSenha(novaSenha) },
    })
  },

  async seedAdmin() {
    const adminLogin = process.env.ADMIN_LOGIN ?? 'DumarrecoAdmin'
    const adminPass = process.env.ADMIN_PASS ?? 'Duma2018'

    const exists = await prisma.usuario.findUnique({ where: { login: adminLogin } })
    if (exists) return

    await prisma.usuario.create({
      data: {
        login: adminLogin,
        senhaHash: hashSenha(adminPass),
        root: true,
      },
    })
    console.log(`Admin user "${adminLogin}" created.`)
  },
}
