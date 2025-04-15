# Processo de Scheduling - Documentação Técnica (API Services)

## 1. Visão Geral do Processo

### 1.1 Objetivo
Desenvolver e disponibilizar APIs robustas para o sistema de agendamento que permitam a integração com o RPA, gerenciando consultas médicas e procedimentos, integrando com WhatsApp para confirmações e gerando relatórios automatizados.

### 1.2 Fluxo Principal
1. Disponibilizar endpoints para coleta de dados do agendamento (IPM -> Tasy)
2. Fornecer APIs para processamento de notificações via WhatsApp
3. Implementar endpoints para geração de relatórios de presença/ausência

## 2. Requisitos de Implementação

### 2.1 Ajustes no Scheduler Service
- [X] Modificar horário do job para 00:00:01 (atualmente às 06:00)
- [X] Implementar endpoint para coleta de dados 48 horas antes do agendamento
- [X] Adicionar validação de número de telefone celular via API
- [X] Implementar sistema de retry para notificações (até 3 tentativas)

### 2.2 Modelo de Dados (IAppointment)
Adicionar campos obrigatórios:
- [ ] `appointmentType`: 'Consulta' | 'Procedimento'
- [ ] `specialty`: string
- [ ] `examProtocol`: string (opcional, apenas para Procedimentos)
- [ ] `whatsappStatus`: 'pending' | 'sent' | 'delivered' | 'failed'
- [ ] `retryCount`: number
- [ ] `cpf`: string (obrigatório)

### 2.3 Sistema de Notificações
- [X] Implementar endpoint para envio 40 horas antes do agendamento
- [X] Configurar janela de resposta de 24 horas via API
- [ ] Desenvolver templates de mensagem específicos por tipo:
  - [ ] Template para Consultas
  - [ ] Template para Procedimentos (com anexo de preparo)
- [X] Implementar lógica de retry automático via API

### 2.4 Geração de Relatórios
Implementar endpoints para 3 tipos de relatórios automáticos:
- [X] Relatório de Cancelamentos
  - Data/Hora
  - Dados do paciente
  - Motivo do cancelamento
  
- [X] Relatório de Confirmações
  - Data/Hora
  - Dados do paciente
  - Horário da confirmação
  
- [X] Relatório de Não Respondidos/Sem WhatsApp
  - Data/Hora
  - Dados do paciente
  - Motivo (sem WhatsApp ou sem resposta)

### 2.5 Integrações
- [ ] Desenvolver APIs para integração com IPM para coleta de dados
- [ ] Criar endpoints para integração com Tasy para atualização de status
- [ ] Implementar API para envio automático de relatórios por e-mail

## 3. Melhorias Técnicas

### 3.1 Performance
- [ ] Implementar cache para consultas frequentes
- [ ] Otimizar queries de banco de dados
- [ ] Configurar índices apropriados

### 3.2 Monitoramento
- [ ] Adicionar logs estruturados
- [ ] Implementar métricas de sucesso/falha
- [ ] Configurar alertas para falhas críticas

### 3.3 Segurança
- [ ] Implementar validação de dados
- [ ] Configurar rate limiting
- [ ] Adicionar autenticação nos endpoints

## 4. Cronograma de Implementação

### Semana 1: Infraestrutura
- [ ] Ajuste do modelo de dados
- [ ] Configuração do novo horário do scheduler
- [ ] Implementação da validação de telefone via API

### Semana 2: Notificações
- [ ] Desenvolvimento dos endpoints de templates
- [ ] Implementação do sistema de retry via API
- [ ] Configuração da janela de resposta

### Semana 3: Relatórios
- [ ] Desenvolvimento dos endpoints para os 3 tipos de relatório
- [ ] Implementação do envio automático via API
- [ ] Configuração de formatação PDF

### Semana 4: Integrações
- [ ] Desenvolvimento de APIs para integração com IPM
- [ ] Criação de endpoints para integração com Tasy
- [ ] Implementação de API para envio de e-mails

### Semana 5: Testes e Ajustes
- [ ] Testes de carga nas APIs
- [ ] Ajustes de performance
- [ ] Documentação final da API

## 5. Observações Importantes

### 5.1 Regras de Negócio Críticas
- APIs devem permitir envio de notificações exatamente 40 horas antes
- Máximo de 3 tentativas de envio por WhatsApp via API
- Janela de resposta de 24 horas deve ser estritamente respeitada
- Endpoints para relatórios devem estar disponíveis após o fechamento da janela de resposta

### 5.2 Pontos de Atenção
- Garantir que o horário do servidor esteja sincronizado
- Implementar tratamento de fusos horários nas APIs
- Manter backup dos relatórios gerados
- Implementar logs detalhados para auditoria

## 6. Métricas de Sucesso

### 6.1 KPIs Técnicos
- Taxa de disponibilidade da API > 99.9%
- Tempo de resposta da API < 500ms
- Taxa de sucesso nas chamadas de API > 99%

### 6.2 KPIs de Negócio
- Taxa de confirmação de consultas via API
- Redução no número de faltas
- Tempo médio de resposta dos pacientes

## 7. Documentação da API

### 7.1 Swagger/OpenAPI
- [ ] Documentar todos os endpoints disponíveis
- [ ] Incluir exemplos de requisições e respostas
- [ ] Detalhar códigos de erro e tratamento

### 7.2 Guia de Integração
- [ ] Criar guia para equipe de RPA
- [ ] Documentar fluxos de integração
- [ ] Fornecer exemplos de uso para cada endpoint 