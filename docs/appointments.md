# Análise dos Endpoints de Agendamento

## Visão Geral

Este documento analisa os endpoints de agendamento implementados no sistema, comparando-os com os requisitos especificados no PDD WhatsApp.md. O objetivo é verificar a conformidade e identificar possíveis melhorias.

## Endpoints Implementados

### 1. Endpoints do Scheduler

#### GET /scheduler/appointments
- **Descrição**: Lista todos os agendamentos com filtros opcionais
- **Parâmetros**: Filtros por data, hora, status e notificação enviada
- **Lógica**: Utiliza o `DatabaseService` para buscar agendamentos que correspondem aos filtros
- **Conformidade com PDD**: Este endpoint é útil para consultas gerais, mas não está diretamente relacionado aos fluxos específicos do PDD

#### GET /scheduler/appointments/48hours
- **Descrição**: Coleta agendamentos que ocorrerão em 48 horas
- **Lógica**: 
  - Calcula a data de 48 horas à frente
  - Busca agendamentos para essa data
  - Adiciona jobs de notificação para cada agendamento encontrado
- **Conformidade com PDD**: Este endpoint está alinhado com o Passo 1 do PDD, que menciona a coleta de dados 48 horas antes

#### GET /scheduler/appointments/40hours
- **Descrição**: Coleta agendamentos que ocorrerão em 40 horas
- **Lógica**: 
  - Calcula a data de 40 horas à frente
  - Busca agendamentos para essa data
  - Adiciona jobs de notificação para cada agendamento encontrado
- **Conformidade com PDD**: Este endpoint está alinhado com o Passo 2 do PDD, que menciona o envio de mensagens 40 horas antes

#### POST /scheduler/appointments
- **Descrição**: Cria um novo agendamento
- **Parâmetros**: Dados do agendamento (nome, telefone, CPF, data, hora, especialidade, tipo)
- **Lógica**: 
  - Valida o número de telefone
  - Formata o número para o padrão WhatsApp
  - Cria o agendamento no banco de dados
- **Conformidade com PDD**: Este endpoint permite a criação de agendamentos, mas não está diretamente relacionado aos fluxos específicos do PDD

#### PUT /scheduler/appointments/:id
- **Descrição**: Atualiza um agendamento existente
- **Parâmetros**: ID do agendamento e dados a serem atualizados
- **Lógica**: 
  - Valida o número de telefone se for atualizado
  - Atualiza o agendamento no banco de dados
- **Conformidade com PDD**: Este endpoint permite a atualização de agendamentos, mas não está diretamente relacionado aos fluxos específicos do PDD

#### DELETE /scheduler/appointments/:id
- **Descrição**: Remove um agendamento
- **Parâmetros**: ID do agendamento
- **Lógica**: Remove o agendamento do banco de dados
- **Conformidade com PDD**: Este endpoint permite a remoção de agendamentos, mas não está diretamente relacionado aos fluxos específicos do PDD

### 2. Endpoints de Consultas Médicas

#### POST /medical-consultations
- **Descrição**: Cria uma nova consulta médica
- **Parâmetros**: Dados da consulta (nome, telefone, CPF, data, hora, especialidade, tipo)
- **Lógica**: 
  - Cria um agendamento com status 'scheduled'
  - Utiliza o mesmo serviço do scheduler para criar o agendamento
- **Conformidade com PDD**: Este endpoint permite a criação de consultas médicas, mas não está diretamente relacionado aos fluxos específicos do PDD

## Processamento de Notificações

O sistema utiliza um processador de notificações (`NotificationProcessor`) que processa diferentes tipos de notificações:

### Tipo 'appointment_40h'
- **Lógica**: 
  - Prepara a mensagem baseada no tipo de agendamento (consulta ou procedimento)
  - Cria um job do WhatsApp para enviar a mensagem
  - Marca a notificação como enviada
- **Conformidade com PDD**: Este processador está alinhado com o Passo 2 do PDD, que menciona o envio de mensagens 40 horas antes

### Tipo 'appointment'
- **Lógica**: Marca a notificação como enviada
- **Conformidade com PDD**: Este processador parece ser um processador genérico para notificações de agendamento

### Tipo 'business_area_report'
- **Lógica**: Processa relatórios para a área de negócios
- **Conformidade com PDD**: Este processador está alinhado com o Passo 3 do PDD, que menciona a geração de relatórios

### Tipo 'error_alert'
- **Lógica**: Processa alertas de erro
- **Conformidade com PDD**: Este processador não está diretamente relacionado aos fluxos específicos do PDD

## Análise de Conformidade com o PDD

### Passo 1: Coleta de Dados 48 Horas Antes
- ✅ Endpoint `/scheduler/appointments/48hours` implementado
- ✅ Job agendado para rodar à meia-noite (`handle48HoursCollection`)
- ✅ Lógica para coletar agendamentos 48 horas à frente

### Passo 2: Envio de Mensagens 40 Horas Antes
- ✅ Endpoint `/scheduler/appointments/40hours` implementado
- ✅ Processador de notificações para mensagens de 40 horas
- ✅ Lógica para preparar mensagens baseadas no tipo de agendamento
- ✅ Sistema de retry para até 3 tentativas

### Passo 3: Geração de Relatórios
- ✅ Processador para relatórios da área de negócios
- ❌ Endpoints específicos para os três tipos de relatórios mencionados no PDD

## Endpoints Adicionais (Não Necessários)

1. **GET /scheduler/appointments**: Endpoint genérico para listar agendamentos
2. **POST /scheduler/appointments**: Endpoint para criar agendamentos manualmente
3. **PUT /scheduler/appointments/:id**: Endpoint para atualizar agendamentos manualmente
4. **DELETE /scheduler/appointments/:id**: Endpoint para remover agendamentos manualmente
5. **POST /medical-consultations**: Endpoint para criar consultas médicas

Estes endpoints são úteis para gerenciamento manual de agendamentos, mas não estão diretamente relacionados aos fluxos automatizados descritos no PDD.

## Conclusão

O sistema implementa corretamente os fluxos principais descritos no PDD:
1. Coleta de dados 48 horas antes
2. Envio de mensagens 40 horas antes
3. Processamento de respostas
4. Geração de relatórios

No entanto, faltam endpoints específicos para os três tipos de relatórios mencionados no PDD:
1. Pacientes que desmarcaram
2. Pacientes que confirmaram
3. Pacientes sem WhatsApp ou sem resposta

Recomendo implementar estes endpoints específicos para completar a conformidade com o PDD.

O endpoint `/scheduler/appointments/48hours` está corretamente implementado para buscar agendamentos 48 horas à frente, conforme solicitado.
