# Plano de Implementação Independente - Projeto Digitaly

## O que pode ser implementado agora

### 1. Estrutura Base do Projeto

#### 1.1 Configuração do Projeto
- [x] Projeto NestJS inicializado
- [x] Configuração do TypeScript
- [x] ESLint e Prettier
- [x] Swagger para documentação

#### 1.2 Estrutura de Módulos
- [x] Criar estrutura base dos módulos:
  ```
  src/
  ├── common/           # Utilitários e decorators comuns
  ├── config/           # Configurações do projeto
  ├── whatsapp/         # Módulo de WhatsApp
  ├── scheduler/        # Módulo de agendamento
  ├── reports/          # Módulo de relatórios
  └── interfaces/       # Interfaces e tipos
  ```

#### 1.3 Configuração de Ambiente
- [x] Criar arquivo .env.example com:
  ```env
  # Twilio
  TWILIO_ACCOUNT_SID=your_account_sid
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_FROM_NUMBER=your_whatsapp_number
  TWILIO_TO_NUMBER=default_to_number
  TWILIO_CONTENT_SID=your_template_sid

  # Database
  DB_HOST=localhost
  DB_PORT=5432
  DB_USERNAME=postgres
  DB_PASSWORD=password
  DB_DATABASE=digitaly

  # BullMQ (Redis)
  REDIS_HOST=localhost
  REDIS_PORT=6379

  # API
  API_PORT=3000
  API_PREFIX=api
  ```

### 2. Desenvolvimento Independente

#### 2.1 Módulo de WhatsApp
- [ ] Implementar classes e interfaces:
  ```typescript
  // interfaces/whatsapp.interface.ts
  interface IWhatsappMessage {
    to: string;
    template: string;
    variables: Record<string, string>;
  }

  interface IWhatsappResponse {
    success: boolean;
    messageId?: string;
    error?: string;
  }
  ```

- [ ] Criar DTOs para validação:
  ```typescript
  // whatsapp/dto/send-message.dto.ts
  class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    to: string;

    @IsString()
    @IsNotEmpty()
    template: string;

    @IsObject()
    variables: Record<string, string>;
  }
  ```

#### 2.2 Sistema de Filas (BullMQ)
- [x] Criar interfaces para filas:
  ```typescript
  // interfaces/queue.interface.ts
  interface IQueueOptions {
    attempts: number;
    backoff: {
      type: string;
      delay: number;
    };
  }

  interface IQueueJob<T> {
    data: T;
    options?: IQueueOptions;
  }
  ```

- [x] Implementar serviço de fila mock:
  ```typescript
  // common/services/queue.service.ts
  @Injectable()
  export class QueueService {
    private queues: Map<string, any[]> = new Map();

    async add(queueName: string, data: any, options?: IQueueOptions) {
      if (!this.queues.has(queueName)) {
        this.queues.set(queueName, []);
      }
      const queue = this.queues.get(queueName);
      if (queue) {
        queue.push({ data, options });
      }
    }

    async process(queueName: string, processor: (job: any) => Promise<void>) {
      const queue = this.queues.get(queueName);
      if (queue) {
        for (const job of queue) {
          await processor(job);
        }
      }
    }
  }
  ```

#### 2.3 Sistema de Relatórios
- [ ] Criar interfaces para relatórios:
  ```typescript
  // interfaces/report.interface.ts
  interface IReport {
    generate(): Promise<Buffer>;
    getFormat(): string;
  }

  interface IReportOptions {
    format: 'json' | 'csv' | 'pdf';
    filters?: Record<string, any>;
  }
  ```

- [x] Implementar geradores de relatório mock:
  ```typescript
  // reports/services/report-generator.service.ts
  @Injectable()
  export class ReportGeneratorService {
    async generateReport(type: string, options: IReportOptions): Promise<Buffer> {
      // Implementação mock para testes
      return Buffer.from(JSON.stringify({
        type,
        options,
        generatedAt: new Date(),
        data: []
      }));
    }
  }
  ```

### 3. Testes e Documentação

#### 3.1 Testes Unitários
- [ ] Implementar testes para:
  - Serviços mock
  - DTOs
  - Interfaces
  - Utilitários

#### 3.2 Documentação
- [ ] Documentar:
  - Estrutura do projeto
  - Interfaces
  - DTOs
  - Endpoints mock

### 4. Próximos Passos

1. **Imediato**
   - [x] Implementar estrutura base dos módulos
   - [ ] Criar interfaces e DTOs
   - [x] Desenvolver serviços mock

2. **Curto Prazo**
   - [ ] Implementar testes unitários
   - [ ] Documentar APIs
   - [ ] Criar exemplos de uso

3. **Quando tiver credenciais**
   - [ ] Integrar com Twilio
   - [ ] Configurar banco de dados
   - [ ] Implementar filas BullMQ reais

## Observações Importantes

### O que NÃO depende de credenciais
- [x] Estrutura do projeto
- [ ] Interfaces e tipos
- [ ] DTOs e validações
- [ ] Lógica de negócio
- [ ] Testes unitários
- [ ] Documentação

### O que depende de credenciais
- [ ] Integração com Twilio
- [ ] Configuração do banco de dados
- [ ] Configuração do Redis (para BullMQ)
- [ ] Tokens de autenticação

### O que depende da equipe RPA
- [ ] Endpoints específicos de integração
- [ ] Formatos de dados específicos
- [ ] Fluxos de negócio específicos 