# Parcred Help Desk - TODO

## Banco de Dados / Schema
- [x] Estender enum de roles: admin, agent, correspondent
- [x] Tabela departments (departamentos de suporte)
- [x] Tabela sla_policies (políticas de SLA por tipo e departamento)
- [x] Tabela correspondents (correspondentes bancários)
- [x] Tabela tickets (chamados)
- [x] Tabela ticket_messages (histórico de interações)
- [x] Tabela ticket_attachments (anexos de chamados)
- [x] Tabela notifications (notificações internas)

## Backend (tRPC Routers)
- [x] Router: departments (CRUD - admin only)
- [x] Router: sla (CRUD - admin only)
- [x] Router: correspondents (CRUD - admin/agent)
- [x] Router: tickets (abertura, listagem, atualização, encerramento)
- [x] Router: ticketMessages (histórico de interações)
- [x] Router: ticketAttachments (upload e listagem)
- [x] Router: notifications (listagem, marcar como lida)
- [x] Router: admin/users (listagem e gestão de usuários - admin only)
- [x] Regras de negócio: SLA deadline automático ao abrir ticket
- [x] Regras de negócio: notificação ao abrir, atualizar e encerrar ticket

## Frontend - Layout e Identidade Visual
- [x] Paleta de cores corporativa azul (index.css)
- [x] DashboardLayout customizado com sidebar por perfil
- [x] Sidebar: itens de navegação distintos por perfil (admin, agent, correspondent)
- [x] Header com notificações e perfil do usuário
- [x] Página de login/landing responsiva

## Frontend - Módulos de Cadastro (Admin)
- [x] Página: Gestão de Departamentos (CRUD)
- [x] Página: Gestão de SLA (CRUD)
- [x] Página: Gestão de Correspondentes (CRUD)
- [x] Página: Gestão de Usuários (listagem, edição de perfil)

## Frontend - Módulo de Tickets
- [x] Página: Abertura de chamado (correspondente)
- [x] Página: Meus chamados (correspondente) - histórico e acompanhamento
- [x] Página: Fila de chamados (agente) - listagem com filtros
- [x] Página: Detalhe do chamado - histórico, mensagens, status, SLA
- [x] Página: Gestão de chamados (admin) - visão geral e relatórios

## Frontend - Dashboards
- [x] Dashboard Admin: métricas gerais, tickets por status, SLA, departamento
- [x] Dashboard Agente: fila de atendimento, tickets atribuídos, SLA em risco
- [x] Dashboard Correspondente: resumo dos próprios chamados, status

## Frontend - Notificações
- [x] Componente de notificações no header (badge com contagem)
- [x] Painel de notificações (dropdown ou página)
- [x] Disparo automático ao abrir, atualizar e encerrar ticket

## Testes
- [x] Testes vitest para routers principais (24 testes passando)
- [x] Verificação de responsividade mobile/tablet

## Autenticação Própria (e-mail + senha)
- [x] Instalar bcryptjs
- [x] Adicionar campo passwordHash na tabela users, tornar openId opcional
- [x] Reescrever backend de auth: login, logout, me com JWT próprio
- [x] Remover todas as referências ao Manus OAuth
- [x] Reescrever tela de login com formulário e-mail/senha
- [x] Reescrever useAuth hook sem dependência do Manus
- [x] Criar usuário admin padrão via seed SQL
- [x] Atualizar DashboardLayout para usar novo useAuth
