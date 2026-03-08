# Referencias de UX - CRM de atendimento

Este documento registra as referencias usadas para desenhar a aba **CRM de atendimento** no MVP.

## 1) Zendesk (omnichannel live monitoring)

Padroes aproveitados:

- monitoramento de filas em tempo real por status
- destaque visual para risco de SLA
- supervisao com foco em gargalos por coluna

Fonte: Zendesk Help - omnichannel routing queues live monitoring dashboard.

## 2) Intercom (inbox + SLA)

Padroes aproveitados:

- contexto operacional no mesmo painel (conversa + desempenho)
- visibilidade de SLA e tempo para evitar perdas
- IA assistiva com aprovacao humana para respostas sensiveis

Fonte: Intercom Help - Real-time Dashboard, SLAs for conversations and tickets.

## 3) Kommo (pipeline Kanban para WhatsApp)

Padroes aproveitados:

- kanban como visual primario de operacao
- cards objetivos com dados minimos para triagem rapida
- estagios claros para handoff entre equipe comercial e atendimento

Fonte: documentacao/guia de setup de pipeline Kommo + material oficial WhatsApp CRM.

## Decisoes aplicadas na aba

- colunas fixas por status do ticket (`ABERTO`, `EM_ATENDIMENTO`, `AGUARDANDO_CLIENTE`, `AGUARDANDO_ESTOQUE`, `FECHADO`)
- auto refresh a cada 5 segundos para monitoramento quase em tempo real
- card com:
  - cliente/telefone
  - ultima mensagem
  - estado de SLA (`SEM_SLA`, `NO_PRAZO`, `ATRASADO`)
  - estado da IA (exige aprovacao humana ou nao)
  - confianca da sugestao
