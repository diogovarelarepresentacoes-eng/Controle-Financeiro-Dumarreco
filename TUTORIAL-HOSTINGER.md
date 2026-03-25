# Tutorial: Publicar o Controle Financeiro Dumarreco na Hostinger

> **Tipo de aplicação:** React + Vite (SPA estático — sem servidor Node.js).  
> Os dados são salvos localmente no navegador (`localStorage`), portanto não é necessário banco de dados nem backend.

---

## Pré-requisitos

- Node.js 18+ instalado no computador
- Conta na [Hostinger](https://www.hostinger.com.br) com plano de hospedagem compartilhada (qualquer plano Premium ou superior)
- Acesso ao Gerenciador de Arquivos ou a um cliente FTP (ex.: FileZilla)

---

## Passo 1 — Gerar o Build de Produção (no seu computador)

Abra o terminal na pasta do projeto e execute:

```bash
npm install
npm run build
```

Após a conclusão, será criada uma pasta chamada **`dist/`** na raiz do projeto.  
Essa pasta contém todos os arquivos prontos para publicação (`index.html`, JS, CSS, imagens).

> O arquivo `.htaccess` que faz o React Router funcionar já é incluído automaticamente na pasta `dist/` pelo Vite.

---

## Passo 2 — Acessar o Painel da Hostinger (hPanel)

1. Acesse [hpanel.hostinger.com](https://hpanel.hostinger.com) e faça login.
2. Clique em **Gerenciar** ao lado do seu domínio/hospedagem.

---

## Passo 3 — Fazer Upload dos Arquivos

Você pode usar o **Gerenciador de Arquivos** (mais simples) ou **FTP** (mais rápido para muitos arquivos).

### Opção A — Gerenciador de Arquivos (recomendado para iniciantes)

1. No hPanel, vá em **Arquivos → Gerenciador de Arquivos**.
2. Navegue até a pasta **`public_html`** (raiz do seu domínio).
3. **Apague** quaisquer arquivos padrão existentes (`index.html` de boas-vindas, etc.).
4. Clique em **Fazer upload** e selecione **todos os arquivos e pastas** dentro da pasta `dist/` do seu computador.
   - Você também pode compactar a pasta `dist/` em um `.zip`, fazer upload do zip e extrair direto no Gerenciador de Arquivos.
5. Aguarde o upload completar.

### Opção B — FTP com FileZilla

1. No hPanel, vá em **Avançado → Contas FTP** e anote (ou crie) as credenciais de FTP.
2. Abra o FileZilla e conecte usando:
   - **Host:** `ftp.seudominio.com.br`
   - **Usuário e Senha:** os da conta FTP
   - **Porta:** `21`
3. No painel direito (servidor), navegue até `/public_html/`.
4. No painel esquerdo (seu computador), navegue até a pasta `dist/` do projeto.
5. Selecione **todos os arquivos e pastas** dentro de `dist/` e arraste para `/public_html/`.

---

## Passo 4 — Verificar o `.htaccess`

O arquivo `.htaccess` (incluído automaticamente no build) é responsável por redirecionar todas as rotas para o `index.html`, permitindo que o React Router funcione corretamente.

Confirme que ele está presente em `public_html/.htaccess` no Gerenciador de Arquivos.  
O conteúdo correto é:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
```

> Se o arquivo não aparecer no Gerenciador de Arquivos, ative a exibição de **arquivos ocultos** (ícone de olho ou opção "Mostrar arquivos ocultos").

---

## Passo 5 — Acessar a Aplicação

Abra o navegador e acesse o seu domínio (ex.: `https://www.seudominio.com.br`).

A aplicação deve carregar normalmente. Navegue entre as páginas (Dashboard, Despesas, Vendas etc.) para confirmar que o roteamento está funcionando.

---

## Passo 6 — Configurar HTTPS (opcional, mas recomendado)

1. No hPanel, vá em **Segurança → SSL**.
2. Instale o certificado **SSL grátis (Let's Encrypt)** para o seu domínio.
3. Ative a opção **Forçar HTTPS** para redirecionar automaticamente `http://` para `https://`.

---

## Como Atualizar a Aplicação no Futuro

Sempre que fizer alterações no código, repita:

```bash
npm run build
```

Depois substitua os arquivos antigos em `public_html/` pelos novos gerados na pasta `dist/`.

> **Dica:** Para não perder arquivos, delete o conteúdo de `public_html/` antes de subir a nova versão — exceto se houver outros projetos na mesma pasta.

---

## Observações Importantes

| Ponto | Detalhe |
|---|---|
| **Dados** | São salvos no `localStorage` do navegador de cada usuário. Ao limpar o histórico/cache do navegador os dados são perdidos. |
| **Multi-usuário** | Não é suportado. Cada computador/navegador tem seus próprios dados. |
| **Backup** | Exporte os relatórios em PDF regularmente pelo menu da aplicação. |
| **Subpasta** | Se publicar em uma subpasta (ex.: `public_html/financeiro/`), é necessário ajustar o `base` no `vite.config.js` antes de rodar o build: `base: '/financeiro/'` |

---

## Solução de Problemas

**Página em branco ao acessar o domínio**
- Verifique se o `index.html` está direto em `public_html/` (e não dentro de uma subpasta `dist/`).

**Erro 404 ao recarregar a página ou acessar uma rota diretamente**
- O `.htaccess` não foi enviado ou está com conteúdo errado. Revise o Passo 4.

**Erro 500 (Internal Server Error)**
- Pode ser que o módulo `mod_rewrite` esteja desativado. Entre em contato com o suporte da Hostinger para ativá-lo (já vem ativo na maioria dos planos).

**Upload muito lento**
- Use a opção de compactar em `.zip` e extrair no Gerenciador de Arquivos da Hostinger.
