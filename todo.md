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

## Melhorias v2
- [x] Endpoint e formulário de criação de novo usuário na tela de gestão de usuários
- [x] Restringir itens de menu da sidebar: cadastros e administração visíveis apenas para admin
- [x] Botão "Novo Chamado" em destaque na sidebar (visível para todos os perfis)
- [x] Favicon de engrenagem verde

## Identidade Visual v3
- [x] Upload do logo Parcred e geração de favicon com a marca
- [x] Aplicar logo na tela de login
- [x] Aplicar logo na sidebar

## Correspondentes com Login Próprio
- [x] Remover campo "código bancário" do formulário de cadastro de correspondentes
- [x] Adicionar campos e-mail e senha no cadastro de correspondente para criar usuário automaticamente
- [x] Backend: ao criar correspondente, criar usuário com perfil "correspondent" e vincular
- [x] Backend: ao editar correspondente, permitir redefinir senha do usuário vinculado

## Senha e Recuperação de Acesso
- [x] Backend: endpoint changePassword (usuário autenticado altera a própria senha)
- [x] Backend: tabela password_reset_tokens e endpoints requestPasswordReset + resetPassword
- [x] Backend: envio de e-mail com token de recuperação (notificação via sistema)
- [x] Frontend: modal "Alterar minha senha" no menu do perfil (sidebar footer)
- [x] Frontend: tela /forgot-password com formulário de e-mail
- [x] Frontend: tela /reset-password?token=... com formulário de nova senha

## Abertura de Chamado v2
- [x] Remover campo "tipo de chamado" do formulário de abertura
- [x] Remover campo "prioridade" do formulário de abertura (definida pelo agente)
- [x] Tornar tipo e prioridade opcionais/com valor padrão no backend
- [x] Adicionar upload de anexos opcional no formulário de abertura
- [x] Garantir que agente/admin possa definir prioridade na tela de detalhe do chamado

## Bug Fix
- [x] Responsável não exibe o nome do agente atribuído na tela de detalhe do chamado

## Bug Fix v2
- [x] Histórico de mensagens exibe "Usuário #XXXXXX" em vez do nome real do usuário1rio

## Bug Fix v3
- [x] Seletor de status não mostrava o status atual do ticket (sempre exibia placeholder vazio)
- [x] Botão de salvar status ficava habilitado mesmo sem mudança (agora desabilitado quando status é igual ao atual)
- [x] Cache da lista de tickets não era invalidado após atualização de status

## Anexos em Mensagens (Interações do Chamado)
- [x] Adicionar botão de anexar arquivo na caixa de resposta do TicketDetail
- [x] Upload do arquivo via /api/upload ao enviar a mensagem
- [x] Vincular o anexo à mensagem criada (messageId na tabela ticket_attachments)
- [x] Exibir anexos vinculados a cada mensagem no histórico com link para download
- [x] Exibir anexos da abertura do chamado (sem messageId) em seção separada no detalhe

## Ajuste Visual - Login e Home
- [x] Fundo branco nas telas de login e home (remover fundo verde escuro)
- [x] Garantir contraste adequado em todos os textos (títulos, labels, placeholders)
- [x] Revisar cores do card de login para combinar com fundo branco

## Bug Fix - Fundo Verde em Tela Não Autenticada
- [x] Corrigir fundo verde escuro na tela de "não autenticado" exibida em /dashboard (e demais rotas protegidas)

## Gestão de Usuários - Edição e Permissões por Departamento
- [ ] Modal de edição de dados cadastrais do usuário (nome, e-mail, role, senha opcional)
- [ ] Tabela user_department_permissions no banco (userId, departmentId)
- [ ] Procedure users.update para editar dados do usuário
- [ ] Procedure users.setDepartmentPermissions para salvar permissões por departamento
- [ ] Procedure users.getDepartmentPermissions para listar permissões do usuário
- [ ] Seção de permissões por departamento no modal de edição (checkboxes por departamento + opção "Todos")
- [ ] Filtro de departamentos aplicado no Dashboard (stats e lista de tickets recentes)
- [ ] Filtro de departamentos aplicado na lista de chamados (TicketsList)
- [ ] Admins com "Todos os departamentos" veem tudo (comportamento atual preservado)

## Gestão de Usuários v2 - Concluído
- [x] Modal de edição de dados cadastrais do usuário (nome, e-mail, role, ativo, senha opcional)
- [x] Tabela user_department_permissions no banco (userId, departmentId, unique constraint)
- [x] Procedure admin.updateUser para editar dados do usuário
- [x] Procedure admin.setUserDepartmentPermissions para salvar permissões por departamento
- [x] Procedure admin.getUserDepartmentPermissions para listar permissões do usuário
- [x] Seção de permissões por departamento no modal de edição (checkboxes por departamento)
- [x] Filtro de departamentos aplicado em tickets.list, tickets.myTickets e tickets.stats no backend
- [x] Indicador visual de "Visão filtrada" no painel administrativo
- [x] Admins/agentes sem restrição veem todos os departamentos (comportamento preservado)
