# Sistema de Agendamento e Notificações

Sistema desenvolvido em NestJS para gerenciamento de agendamentos e envio de notificações via WhatsApp.

## Funcionalidades

- Agendamento de consultas
- Notificações automáticas via WhatsApp
- Geração de relatórios (PDF e CSV)
- Processamento assíncrono com BullMQ
- Agendamento de tarefas com @nestjs/schedule

## Requisitos

- Node.js 16+
- Redis
- Conta Twilio (para envio de mensagens WhatsApp)

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
- Copie o arquivo `.env.example` para `.env`
- Preencha as variáveis com seus valores

4. Inicie o Redis:
```bash
docker run -d -p 6379:6379 redis
```

5. Inicie o servidor:
```bash
npm run start:dev
```

## Estrutura do Projeto

```
src/
├── common/
│   ├── interfaces/
│   ├── queue/
│   └── services/
├── config/
├── reports/
├── scheduler/
└── app.module.ts
```

## API Endpoints

### Relatórios

- `POST /reports/attendance` - Gera lista de presença
- `POST /reports/absentees` - Gera lista de ausentes
- `GET /reports/status/:jobId` - Verifica status do relatório
- `GET /reports/download/:jobId` - Download do relatório

### Agendamentos

- `GET /scheduler/appointments` - Lista agendamentos
- `POST /scheduler/appointments` - Cria agendamento
- `PUT /scheduler/appointments/:id` - Atualiza agendamento
- `DELETE /scheduler/appointments/:id` - Remove agendamento

## Tecnologias Utilizadas

- NestJS
- BullMQ
- Redis
- Twilio
- TypeScript
- Swagger

## Licença

MIT
