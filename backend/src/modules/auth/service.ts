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
