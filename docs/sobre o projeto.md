# Projeto Digitaly - Documento Técnico para Automação

## Visão Geral

Serviço backend desenvolvido em **Nest.js** com integração ao **Twilio** para envio de mensagens via WhatsApp, operando com filas internas de processamento usando **BullMQ**. Integrações adicionais serão realizadas com equipe de **RPA** via autenticação por token. Futuramente, planeja-se a integração direta com o sistema **Tazi**.

---

## Funcionalidade 1: Disparo WhatsApp via Schedule

### Descrição
Serviço executado periodicamente (via scheduler) para:
- Consultar base de dados.
- Identificar registros que ainda não foram notificados.
- Enviar esses registros para uma fila interna.
- Disparar mensagem via Twilio/WhatsApp com template pré-definido.

### Requisitos Técnicos
- Nest.js
- BullMQ (Gerenciamento de Filas)
- Twilio WhatsApp API
- Banco de Dados (MySQL/Postgres?)
- Auth Token (para integrar com RPA futuramente)

---

## Funcionalidade 2: Captação de Resposta do Paciente

### Descrição
- Interpretar a resposta do paciente via WhatsApp.
- Identificar se a consulta foi confirmada ou recusada.

### Comportamento
- Se a resposta for **"não"**, acionar endpoint da equipe de **RPA** com token de autenticação para desmarcar a consulta no sistema Tazi.

### Requisitos Técnicos
- Webhook de recepção Twilio
- Parser de mensagem
- HTTP Client (Nest.js) para integrar com serviço de RPA

---

## Funcionalidade 3: Geração de Relatórios Diários (Pré-expediente)

### Descrição
Agendamento diário antes do início do expediente que realiza:
- Geração de **lista de presença**: Nome, telefone e observações.
- Geração de **lista de ausentes/desmarcados**.

### Requisitos Técnicos
- Schedule diário (via BullMQ)
- Exportação de relatórios (JSON, CSV ou PDF?)
- Integração com banco de dados
- Possível envio por e-mail ou endpoint da RPA

---

## Planejamento Futuro -- NÃO DEVE SER FEITO NESSA VERSÃO, apenas tenha em mente que pode expandir e deve ser levado em conta na estruturação

- Integração direta com o sistema **Tazi**
- Centralização das regras de negócio no backend Nest.js
- Unificação do controle de agendamento e notificações

---

## Considerações de Segurança

- Toda comunicação com a RPA deve utilizar **Token de autenticação**
- As mensagens enviadas devem estar de acordo com as políticas da **Twilio**
- Logger centralizado para rastreabilidade dos fluxos
