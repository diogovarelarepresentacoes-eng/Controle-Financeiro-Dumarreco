import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="mx-auto max-w-7xl p-4">
          <header className="mb-4 flex items-center justify-between rounded bg-white p-4 shadow">
            <h1 className="text-lg font-semibold">CRM WhatsApp Dumarreco</h1>
            <nav className="flex gap-3 text-sm">
              <Link href="/crm-atendimento">CRM de atendimento</Link>
              <Link href="/inbox">Inbox</Link>
              <Link href="/kanban">Kanban</Link>
              <Link href="/metas">Metas</Link>
              <span className="text-slate-400">|</span>
              <details className="relative">
                <summary className="cursor-pointer list-none">Configuracoes</summary>
                <div className="absolute right-0 top-6 min-w-44 rounded border border-slate-200 bg-white p-2 shadow">
                  <Link href="/configuracoes/whatsapp-ia" className="block text-sm">
                    WhatsApp & IA
                  </Link>
                </div>
              </details>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
