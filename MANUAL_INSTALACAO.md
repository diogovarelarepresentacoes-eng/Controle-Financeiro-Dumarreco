# Manual de Instalação – Controle Financeiro Dumarreco (Rede Local)

Este manual descreve como instalar e executar o sistema em um servidor na rede local para que outros computadores possam acessá-lo pelo navegador.

---

## 1. Requisitos do servidor

- **Node.js** versão 18 ou superior (recomendado LTS).  
  Download: https://nodejs.org/

- **Windows 10/11** ou outro sistema onde o Node.js esteja instalado.

---

## 2. Instalação no servidor

### 2.1 Copiar o projeto para o servidor

Copie a pasta completa do projeto **Controle Financeiro Dumarreco** para o computador que será o servidor (ex.: `C:\ControleFinanceiroDumarreco`).

### 2.2 Instalar dependências

1. Abra o **Prompt de Comando** ou **PowerShell**.
2. Acesse a pasta do projeto:
   ```cmd
   cd C:\ControleFinanceiroDumarreco
   ```
   (Ajuste o caminho se tiver colocado em outro local.)

3. Instale as dependências:
   ```cmd
   npm install
   ```

### 2.3 Gerar a versão para produção (build)

Ainda na pasta do projeto, execute:

```cmd
npm run build
```

Isso gera a pasta `dist` com os arquivos que o navegador vai usar. Não é necessário repetir o build a cada uso; só faça de novo quando atualizar o sistema.

---

## 3. Executar o servidor na rede local

Na pasta do projeto, execute:

```cmd
npm run servidor
```

Ou, de forma equivalente:

```cmd
npm run preview -- --host
```

Você verá uma mensagem parecida com:

```
  ➜  Local:   http://localhost:4173/
  ➜  Network: http://192.168.1.100:4173/
```

- **Local:** acesso no próprio servidor.
- **Network:** endereço para outros PCs da rede (o IP pode ser diferente no seu caso).

### 3.1 Descobrir o IP do servidor (Windows)

No PowerShell ou CMD do servidor, execute:

```cmd
ipconfig
```

Procure o endereço **IPv4** do adaptador em uso (ex.: Wi-Fi ou Ethernet), algo como `192.168.1.100`.

### 3.2 Acessar de outros computadores

Nos outros PCs da rede (no mesmo Wi-Fi/LAN):

1. Abra o navegador (Chrome, Edge, Firefox, etc.).
2. Digite na barra de endereços:
   ```
   http://IP-DO-SERVIDOR:4173
   ```
   Exemplo: `http://192.168.1.100:4173`

3. A tela inicial do Controle Financeiro Dumarreco será exibida.

**Importante:** Os dados (contas, boletos, vendas) ficam armazenados no **localStorage do navegador** de cada computador. Ou seja, cada PC terá seus próprios dados, a menos que todos acessem sempre pelo mesmo navegador no mesmo computador.

---

## 4. Zerar o banco de dados (remover dados de teste)

O sistema não vem com dados de teste. Se em algum momento você tiver usado dados apenas para teste e quiser começar do zero:

1. Acesse o sistema pelo navegador.
2. No menu lateral, clique em **Configurações**.
3. Na seção **Zerar banco de dados**, clique em **Zerar todos os dados**.
4. Confirme em **Sim, zerar tudo**.

Isso apaga **todos** os dados (contas, boletos, movimentações e vendas) **desse navegador**. A ação não pode ser desfeita.

Para “zerar” em outro computador, repita o processo no navegador daquele PC.

---

## 5. Manter o servidor ligado

- Enquanto a janela do terminal estiver aberta com `npm run servidor` rodando, o sistema fica acessível na rede.
- Se fechar o terminal ou desligar o servidor, o acesso para. Para voltar a usar, abra de novo o terminal na pasta do projeto e execute `npm run servidor`.

### 5.1 (Opcional) Iniciar com o Windows

Para o servidor subir automaticamente ao ligar o PC:

1. Crie um atalho que execute:
   - **Destino:** `cmd.exe /k "cd /d C:\ControleFinanceiroDumarreco && npm run servidor"`
   - (Ajuste `C:\ControleFinanceiroDumarreco` para o caminho real do projeto.)
2. Pressione `Win + R`, digite `shell:startup` e Enter.
3. Coloque o atalho dentro da pasta que abrir.

Assim, ao logar no Windows, o servidor será iniciado automaticamente (a janela do CMD ficará aberta).

---

## 6. Desenvolvimento (opcional)

Se for alterar o código e testar em rede antes do build:

```cmd
npm run dev
```

O sistema ficará acessível em `http://IP-DO-SERVIDOR:5173`. O endereço será mostrado no terminal. Use isso só em ambiente de desenvolvimento; em uso normal, use `npm run build` e `npm run servidor` como acima.

---

## 7. Resumo dos comandos

| Ação                    | Comando           |
|-------------------------|-------------------|
| Instalar dependências  | `npm install`     |
| Gerar build (produção) | `npm run build`   |
| Subir servidor na rede | `npm run servidor`|
| Zerar dados            | Menu Configurações → Zerar banco de dados |

---

## 8. Problemas comuns

- **Outros PCs não acessam:** Verifique se o firewall do Windows não está bloqueando a porta 4173. Pode ser necessário permitir “Node” ou criar uma regra para a porta 4173 (TCP).
- **Porta em uso:** Se aparecer erro de porta já em uso, você pode usar outra porta, por exemplo:  
  `npx vite preview --host --port 8080`  
  e acessar com `http://IP-DO-SERVIDOR:8080`.
- **Dados não aparecem em outro PC:** É esperado: os dados ficam no navegador de cada máquina. Cada computador tem sua própria “cópia” dos dados no localStorage.

---

*Controle Financeiro Dumarreco – Manual de Instalação em Rede Local*
