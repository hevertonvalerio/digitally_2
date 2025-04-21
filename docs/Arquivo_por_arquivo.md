# Documentação do Projeto

## Índice
1. [Scripts](#scripts)
2. [Código Fonte](#código-fonte)

## Scripts
### Arquivos de Configuração
#### setup-postgres.ps1
Este script PowerShell automatiza a instalação e configuração do PostgreSQL no ambiente Windows. Ele realiza as seguintes operações:
1. Verifica e instala o Chocolatey (gerenciador de pacotes para Windows) se não estiver presente
2. Instala o PostgreSQL usando o Chocolatey
3. Configura as variáveis de ambiente necessárias
4. Inicia o serviço do PostgreSQL
5. Cria um banco de dados chamado "projeto_digitaly"
6. Configura a senha padrão como "postgres"

O script é essencial para a configuração inicial do ambiente de desenvolvimento, garantindo que o PostgreSQL esteja instalado e configurado corretamente.

#### setup-uuid.ps1 e setup-uuid.sql
Estes arquivos trabalham em conjunto para configurar a extensão UUID no PostgreSQL:

- **setup-uuid.ps1**: Script PowerShell que:
  - Define a senha do PostgreSQL
  - Conecta ao banco de dados remoto (vps.iaautomation.com.br)
  - Executa o script SQL setup-uuid.sql

- **setup-uuid.sql**: Script SQL que:
  - Instala a extensão "uuid-ossp" no PostgreSQL, que é necessária para gerar UUIDs (Identificadores Únicos Universais)
  - A extensão é instalada apenas se ainda não existir (usando IF NOT EXISTS)

Esta configuração é importante para o sistema pois permite a geração de identificadores únicos, que são frequentemente usados como chaves primárias em bancos de dados.

#### install-postgres.ps1
Este script PowerShell realiza uma instalação manual do PostgreSQL, diferente do método usando Chocolatey. Ele:

1. Baixa o instalador do PostgreSQL 17.4 diretamente do site oficial
2. Instala o PostgreSQL em modo silencioso com as seguintes configurações:
   - Porta: 5432
   - Senha do superusuário: postgres
   - Nome do serviço: postgresql-x64-17
   - Conta de serviço: NT AUTHORITY\NetworkService
   - Localização: pt_BR (Português do Brasil)
3. Aguarda 30 segundos para o serviço iniciar
4. Cria o banco de dados "projeto_digitaly"

Este script oferece uma alternativa de instalação mais controlada, permitindo especificar exatamente qual versão do PostgreSQL será instalada.

### Scripts de Migração
#### clean-and-migrate.ts
Este script TypeScript realiza uma migração completa do banco de dados SQLite para PostgreSQL, com limpeza prévia do banco de destino. O processo inclui:

1. **Preparação do Banco PostgreSQL**:
   - Conecta ao banco 'postgres' padrão
   - Cria o banco de dados do projeto se não existir
   - Limpa completamente o schema público (DROP SCHEMA CASCADE)
   - Recria o schema público com as permissões adequadas

2. **Migração de Dados**:
   - Migra dados de Clientes (Client)
   - Migra dados de Agendamentos (Appointment)
   - Migra dados de Notificações (Notification)

3. **Transformações de Dados**:
   - Converte tipos de dados apropriadamente
   - Parse de JSON para campos estruturados
   - Conversão de datas
   - Mapeamento de enums e tipos específicos

#### migrate-data.ts
Este script é uma versão mais simples do processo de migração, focando apenas na transferência de dados sem limpeza prévia. Ele:

1. Conecta simultaneamente ao SQLite e PostgreSQL
2. Migra os mesmos tipos de dados (Clientes, Agendamentos, Notificações)
3. Usa o TypeORM para gerenciar as conexões e operações
4. Mantém a estrutura de dados original durante a migração

A principal diferença para o clean-and-migrate.ts é que este script:
- Não limpa o banco de destino
- Usa synchronize: true para criar/atualizar tabelas automaticamente
- Tem tratamento de erro mais simples
- É mais adequado para migrações incrementais

## Código Fonte
### Estrutura Principal
#### main.ts
Este é o ponto de entrada da aplicação NestJS. O arquivo configura e inicializa a aplicação com as seguintes características:

1. **Configuração Básica**:
   - Cria uma instância da aplicação NestJS
   - Configura a porta e prefixo da API usando variáveis de ambiente
   - Implementa um sistema de logging

2. **Documentação Swagger**:
   - Configura a documentação automática da API usando Swagger
   - Define metadados como título, descrição e versão
   - Organiza endpoints em tags lógicas
   - Configura autenticação via API Key (x-client-token)

3. **Endpoints Documentados**:
   - medical-consultations: Endpoints de consultas médicas
   - scheduler: Endpoints de agendamento
   - reports: Endpoints de relatórios
   - whatsapp: Endpoints de WhatsApp

#### app.module.ts
Este é o módulo raiz da aplicação NestJS, responsável por configurar e conectar todos os módulos do sistema:

1. **Módulos Importados**:
   - ConfigModule: Gerenciamento de configurações e variáveis de ambiente
   - DatabaseModule: Conexão e configuração do banco de dados
   - ScheduleModule: Agendamento de tarefas
   - CommonModule: Funcionalidades compartilhadas
   - QueueModule: Sistema de filas
   - ReportsModule: Geração de relatórios
   - SchedulerModule: Agendamento de consultas
   - WhatsappModule: Integração com WhatsApp
   - ClientTokenModule: Autenticação de clientes

2. **Middleware**:
   - Implementa LoggerMiddleware para logging de todas as requisições
   - Aplica o middleware globalmente em todas as rotas

3. **Configurações**:
   - Carrega variáveis de ambiente do arquivo .env
   - Expande variáveis de ambiente
   - Configura cache e opções de ambiente

### Módulos
#### notifications/
O módulo de notificações é responsável por gerenciar o envio e rastreamento de notificações no sistema. A estrutura atual inclui:

1. **Entidades**:
   - **notification.entity.ts**: Define a estrutura de dados para notificações com os seguintes campos:
     - id: Identificador único da notificação
     - clientId: ID do cliente associado
     - appointmentId: ID do agendamento (opcional)
     - messageType: Tipo da mensagem
     - status: Status da notificação
     - whatsappMessageId: ID da mensagem no WhatsApp (opcional)
     - response: Resposta recebida (opcional)
     - sentAt: Data de envio
     - responseAt: Data da resposta (opcional)
     - templateUsed: Template utilizado (opcional)
     
   - **Relacionamentos**:
     - ManyToOne com Client: Uma notificação pertence a um cliente
     - ManyToOne com Appointment: Uma notificação pode estar associada a um agendamento

2. **Funcionalidades**:
   - Rastreamento de envio de mensagens
   - Integração com WhatsApp
   - Associação com agendamentos
   - Histórico de notificações por cliente

#### clients/
O módulo de clientes gerencia as informações e configurações dos clientes do sistema. A estrutura atual inclui:

1. **Entidades**:
   - **client.entity.ts**: Define a estrutura de dados para clientes com os seguintes campos:
     - id: Identificador único do cliente
     - clientName: Nome do cliente
     - cpf: CPF do cliente (único)
     - internalToken: Token interno para autenticação (único)
     - twilioAccountSid: ID da conta Twilio
     - twilioAuthToken: Token de autenticação Twilio
     - twilioFromNumber: Número de origem para mensagens
     - twilioTemplates: Templates de mensagem em formato JSON
     - createdAt: Data de criação do registro

   - **Relacionamentos**:
     - OneToMany com Appointment: Um cliente pode ter vários agendamentos
     - OneToMany com Notification: Um cliente pode ter várias notificações

2. **Funcionalidades**:
   - Gerenciamento de credenciais Twilio
   - Configuração de templates de mensagem
   - Autenticação via token interno
   - Rastreamento de agendamentos e notificações

#### whatsapp/
O módulo WhatsApp é responsável por gerenciar todas as interações com o serviço de mensagens do WhatsApp através da API do Twilio. A estrutura do módulo inclui:

1. **Estrutura de Arquivos**:
   - **whatsapp.module.ts**: Configuração do módulo com:
     - Importação do TypeORM para acesso ao banco de dados
     - Integração com SchedulerModule para agendamentos
     - Integração com QueueModule para processamento assíncrono
     - Configuração de autenticação via ClientTokenModule
     - Exportação dos serviços WhatsappService e PhoneValidatorService

   - **whatsapp.controller.ts**: Endpoints da API com:
     - POST /whatsapp/confirm-appointment: Envio de confirmação de agendamento
     - POST /whatsapp/webhook: Recebimento de atualizações do Twilio
     - Proteção de rotas com ClientTokenGuard
     - Documentação Swagger completa

   - **whatsapp.service.ts**: Implementação da lógica de negócios
     - Integração com a API do Twilio
     - Gerenciamento de templates de mensagem
     - Processamento de webhooks
     - Validação de números de telefone

2. **DTOs (Data Transfer Objects)**:
   - **webhook-request.dto.ts**: Estrutura para dados do webhook do Twilio
   - **whatsapp-response.dto.ts**: Formato de resposta da API
   - **send-appointment-confirmation.dto.ts**: Dados para confirmação de agendamento
   - **send-template-message.dto.ts**: Dados para envio de mensagens template

3. **Funcionalidades Principais**:
   - Envio de mensagens de confirmação de agendamento
   - Processamento de respostas interativas (botões)
   - Rastreamento de status de mensagens
   - Validação de números de telefone
   - Integração com o sistema de agendamentos
   - Processamento assíncrono via filas

4. **Integrações**:
   - Twilio API para envio de mensagens
   - Sistema de agendamentos
   - Sistema de filas para processamento assíncrono
   - Validação de números de telefone
   - Autenticação de clientes

#### scheduler/
O módulo de agendamentos é o núcleo do sistema, responsável por gerenciar consultas e procedimentos médicos. A estrutura do módulo inclui:

1. **Estrutura de Arquivos**:
   - **scheduler.module.ts**: Configuração do módulo com:
     - Integração com CommonModule para funcionalidades compartilhadas
     - Integração com QueueModule para processamento assíncrono
     - Integração com ReportsModule para geração de relatórios
     - Configuração do TypeORM para acesso ao banco de dados
     - Exportação do SchedulerService para uso em outros módulos

   - **scheduler.controller.ts**: Endpoints principais de agendamento
   - **medical-consultations.controller.ts**: Endpoints específicos para consultas médicas
   - **scheduler.service.ts**: Implementação da lógica de negócios de agendamento

2. **Entidades**:
   - **appointment.entity.ts**: Define a estrutura de dados para agendamentos com os campos:
     - id: Identificador único do agendamento
     - clientId: ID do cliente
     - patientName: Nome do paciente
     - patientPhone: Telefone do paciente
     - cpf: CPF do paciente
     - appointmentDate: Data do agendamento
     - appointmentTime: Horário do agendamento
     - status: Status do agendamento (scheduled, confirmed, cancelled, completed)
     - notificationSent: Flag de notificação enviada
     - specialty: Especialidade médica
     - appointmentType: Tipo (consultation ou procedure)
     - examProtocol: Protocolo do exame (opcional)
     - notes: Observações (opcional)
     - lastInteraction: Última interação
     - lastStatus: Último status
     - lastResponse: Última resposta
     - confirmationDate: Data de confirmação
     - confirmationResponse: Resposta de confirmação

   - **Relacionamentos**:
     - ManyToOne com Client: Um agendamento pertence a um cliente
     - OneToMany com Notification: Um agendamento pode ter várias notificações

3. **Funcionalidades Principais**:
   - Criação e gerenciamento de agendamentos
   - Confirmação de consultas via WhatsApp
   - Rastreamento de status de agendamentos
   - Geração de relatórios
   - Notificações automáticas
   - Gestão de consultas e procedimentos

4. **Integrações**:
   - Sistema de notificações WhatsApp
   - Sistema de filas para processamento assíncrono
   - Sistema de relatórios
   - Módulo de clientes
   - Módulo comum para funcionalidades compartilhadas

#### reports/
O módulo de relatórios é responsável por gerar e gerenciar diferentes tipos de relatórios do sistema. A estrutura do módulo inclui:

1. **Estrutura de Arquivos**:
   - **reports.module.ts**: Configuração do módulo com:
     - Integração com ConfigModule para configurações
     - Integração com CommonModule para funcionalidades compartilhadas
     - Configuração do TypeORM para acesso ao banco de dados
     - Exportação do ReportsService para uso em outros módulos

   - **reports.controller.ts**: Endpoints da API para geração de relatórios
   - **reports.service.ts**: Implementação da lógica de geração de relatórios
   - **services/report-generator.service.ts**: Serviço especializado em geração de relatórios

2. **Serviços**:
   - **ReportGeneratorService**: Responsável pela geração de diferentes tipos de relatórios:
     - Lista de Presença (generateAttendanceList)
     - Lista de Ausentes (generateAbsentList)
     - Suporte a múltiplos formatos (PDF, CSV)
     - Sistema de logging para rastreamento

3. **Funcionalidades Principais**:
   - Geração de relatórios em diferentes formatos
   - Listagem de presença e ausências
   - Exportação de dados em CSV e PDF
   - Integração com o sistema de agendamentos
   - Filtros e personalização de relatórios

4. **Integrações**:
   - Sistema de configurações
   - Módulo comum para funcionalidades compartilhadas
   - Sistema de banco de dados
   - Sistema de logging

5. **Status de Implementação**:
   - Algumas funcionalidades estão marcadas como TODO
   - Implementação atual usa dados mockados
   - Preparado para expansão com novos tipos de relatórios

#### database/
O módulo de banco de dados é responsável por configurar e gerenciar a conexão com o PostgreSQL. A estrutura do módulo inclui:

1. **Estrutura de Arquivos**:
   - **database.module.ts**: Configuração central do banco de dados com:
     - Configuração assíncrona do TypeORM
     - Integração com ConfigModule para variáveis de ambiente
     - Configuração de conexão PostgreSQL
     - Registro automático de entidades
     - Exportação do DatabaseService e TypeOrmModule

2. **Configurações do Banco de Dados**:
   - **Conexão**:
     - Tipo: PostgreSQL
     - Host: Configurável via POSTGRES_HOST
     - Porta: Configurável via POSTGRES_PORT
     - Usuário: Configurável via POSTGRES_USER
     - Senha: Configurável via POSTGRES_PASSWORD
     - Banco: Configurável via POSTGRES_DB

   - **Opções**:
     - Synchronize: Ativado para desenvolvimento
     - Logging: Ativo apenas em ambiente de desenvolvimento
     - SSL: Desativado
     - Auto-loading de entidades

3. **Funcionalidades**:
   - Conexão automática com o banco de dados
   - Gerenciamento de transações
   - Auto-criação de tabelas (em desenvolvimento)
   - Logging de queries (em desenvolvimento)
   - Injeção de dependência do DatabaseService

4. **Integrações**:
   - TypeORM para ORM
   - ConfigModule para configurações
   - Sistema de entidades
   - Serviço comum de banco de dados

5. **Observações de Segurança**:
   - Synchronize deve ser desativado em produção
   - Credenciais gerenciadas via variáveis de ambiente
   - SSL pode ser ativado conforme necessidade

#### config/
O módulo de configuração é responsável por gerenciar todas as configurações do sistema. A estrutura do módulo inclui:

1. **Estrutura de Arquivos**:
   - **configuration.ts**: Configuração central do sistema com:
     - Configurações de porta e prefixo da API
     - Credenciais do Twilio
     - Configurações de banco de dados
     - Configurações do Redis
     - Configurações do WhatsApp
     - Configurações de email
     - Debug de variáveis de ambiente

   - **logger.config.ts**: Configuração do sistema de logging com:
     - Rotação diária de arquivos de log
     - Compactação de logs antigos
     - Configuração de níveis de log
     - Formatação de mensagens
     - Integração com Winston

2. **Configurações do Sistema**:
   - **API**:
     - Porta: 3000 (padrão)
     - Prefixo: 'api' (padrão)

   - **Twilio/WhatsApp**:
     - Account SID
     - Auth Token
     - Número de origem
     - Content SID
     - Número de destino

   - **Banco de Dados**:
     - Host
     - Porta (5432 padrão)
     - Usuário
     - Senha
     - Nome do banco

   - **Redis**:
     - Host (localhost padrão)
     - Porta (6379 padrão)

   - **Email**:
     - Usuário
     - Senha de aplicativo

3. **Sistema de Logging**:
   - **Arquivos de Log**:
     - Rotação diária
     - Compactação automática
     - Tamanho máximo: 20MB
     - Retenção: 14 dias
     - Formato JSON

   - **Console**:
     - Logs coloridos
     - Timestamp formatado
     - Nível: info
     - Desativado em produção

4. **Funcionalidades**:
   - Carregamento de variáveis de ambiente
   - Validação de configurações
   - Debug de ambiente
   - Logging estruturado
   - Rotação de logs

5. **Observações de Segurança**:
   - Credenciais sensíveis em variáveis de ambiente
   - Logs separados por ambiente
   - Console desativado em produção
   - Compactação de logs antigos

#### common/
O módulo comum contém funcionalidades compartilhadas entre todos os outros módulos do sistema. A estrutura do módulo inclui:

1. **Estrutura de Diretórios**:
   - **services/**: Serviços compartilhados
   - **queue/**: Sistema de filas
   - **middleware/**: Middlewares da aplicação
   - **interfaces/**: Interfaces TypeScript
   - **guards/**: Guardas de autenticação
   - **decorators/**: Decoradores personalizados

2. **Serviços Compartilhados**:
   - **DatabaseService**: Gerenciamento de conexões e operações do banco
   - **EmailService**: Envio de emails
   - **PhoneValidatorService**: Validação de números de telefone
   - **QueueService**: Gerenciamento de filas de processamento

3. **Middleware**:
   - **LoggerMiddleware**: Logging de requisições HTTP
     - Registro de método, URL, status e tempo de resposta
     - Integração com sistema de logs

4. **Guards**:
   - **ClientTokenGuard**: Autenticação via token de cliente
   - **ClientTokenModule**: Configuração do guard de autenticação

5. **Decoradores**:
   - **GetClient**: Extração do cliente da requisição
   - **PublicRoute**: Marcação de rotas públicas
   - **ApiResponse**: Formatação padronizada de respostas

6. **Funcionalidades Principais**:
   - Autenticação e autorização
   - Logging centralizado
   - Validação de dados
   - Processamento assíncrono
   - Comunicação por email
   - Operações de banco de dados

7. **Integrações**:
   - TypeORM para banco de dados
   - Sistema de configurações
   - Sistema de filas
   - Sistema de logs
   - Serviços de email

8. **Observações de Segurança**:
   - Autenticação via token
   - Validação de dados de entrada
   - Logging de operações sensíveis
   - Proteção de rotas

### PhoneValidatorService

#### Responsabilidades
- Validação e formatação de números de telefone brasileiros
- Suporte específico para números de celular
- Formatação para padrão WhatsApp

#### Funcionalidades
1. **isCellPhone(phone: string)**
   - Valida se um número é de celular brasileiro
   - Aceita formatos: +55DDD9XXXXXXXX ou DDD9XXXXXXXX
   - Verifica:
     - Tamanho correto (11 dígitos)
     - DDD válido (11-99)
     - Número começa com 9 (padrão celular)
   - Limpeza automática de caracteres não numéricos

2. **formatToWhatsApp(phone: string)**
   - Formata número para padrão internacional do WhatsApp
   - Entrada: qualquer formato
   - Saída: +55DDD9XXXXXXXX
   - Validação de formato antes da conversão
   - Tratamento de erros para números inválidos

3. **extractPhoneInfo(phone: string)**
   - Extrai informações detalhadas do número
   - Retorna objeto com:
     - DDD
     - Número
     - Flag isCell
     - Número completo formatado
   - Validação de formato
   - Tratamento de erros

#### Características
- Injeção de dependência (@Injectable)
- Validações robustas
- Limpeza automática de caracteres especiais
- Suporte a múltiplos formatos de entrada
- Tratamento de erros consistente

#### Segurança
- Validação rigorosa de formato
- Sanitização de entrada
- Tratamento de exceções
- Validação de DDD
- Verificação de comprimento

## Análise Detalhada

### Serviços Comuns

#### DatabaseService
O serviço de banco de dados é responsável por gerenciar todas as operações relacionadas aos agendamentos no banco de dados.

1. **Funcionalidades**:
   - **findAppointments**: Busca agendamentos com filtros
     - Filtragem por data, hora, status e notificação
     - Uso de QueryBuilder para consultas dinâmicas
     - Logging detalhado das operações

   - **updateAppointment**: Atualização de agendamentos
     - Atualização parcial de dados
     - Retorno do registro atualizado
     - Logging de alterações

   - **markNotificationSent**: Marcação de notificações enviadas
     - Atualização do status de notificação
     - Registro da data de envio

   - **createAppointment**: Criação de novos agendamentos
     - Conversão automática de datas
     - Validação de dados
     - Logging de criação

   - **deleteAppointment**: Remoção de agendamentos
     - Verificação de sucesso da operação
     - Logging de remoção

   - **getAppointments**: Método público para busca de agendamentos
     - Tratamento de erros
     - Retorno seguro em caso de falha

2. **Características**:
   - Injeção de dependência do repositório
   - Sistema de logging integrado
   - Tratamento de datas
   - Validação de operações
   - Interface tipada (IAppointment)

#### EmailService
O serviço de email gerencia o envio de mensagens e relatórios via email.

1. **Configuração**:
   - Integração com Gmail SMTP
   - Configuração segura (porta 465)
   - Verificação automática da conexão
   - Suporte a TLS
   - Logging detalhado

2. **Funcionalidades**:
   - **sendEmail**: Envio de emails genéricos
     - Suporte a múltiplos destinatários
     - Anexos
     - HTML formatado
     - Logging detalhado

   - **sendReportEmail**: Envio específico para relatórios
     - Formatação automática de datas
     - Templates HTML
     - Nomeação automática de arquivos
     - Suporte a PDF e CSV

3. **Características**:
   - Verificação de credenciais
   - Tratamento de erros robusto
   - Logging detalhado
   - Suporte a anexos
   - Templates HTML

4. **Segurança**:
   - Credenciais via variáveis de ambiente
   - Conexão segura (TLS)
   - Validação de configuração
   - Tratamento de erros sensíveis

### Services

#### phone-validator.service.ts
```typescript
@Injectable()
export class PhoneValidatorService {
  isCellPhone(phone: string): boolean
  formatToWhatsApp(phone: string): string
  extractPhoneInfo(phone: string): PhoneInfo
}
```
- **Propósito**: Validação e formatação de números de telefone brasileiros
- **Métodos**:
  - `isCellPhone`: Valida formato de celular (11 dígitos, DDD 11-99, começa com 9)
  - `formatToWhatsApp`: Converte para formato internacional (+55DDD9XXXXXXXX)
  - `extractPhoneInfo`: Extrai DDD, número e status de celular
- **Validações**:
  - Limpeza de caracteres especiais
  - Verificação de DDD válido
  - Comprimento correto do número
  - Formato de celular (começa com 9)

#### queue.service.ts
```typescript
@Injectable()
export class QueueService {
  addToQueue(data: any, type: string): Promise<void>
  processQueue(): Promise<void>
}
```
- **Propósito**: Gerenciamento de filas de processamento assíncrono
- **Funcionalidades**:
  - Adição de tarefas à fila
  - Processamento assíncrono
  - Tipagem de tarefas
  - Tratamento de erros
- **Integrações**:
  - Sistema de logs
  - Processadores específicos por tipo

#### email.service.ts
```typescript
@Injectable()
export class EmailService {
  sendEmail(to: string[], subject: string, html: string, attachments?: any[]): Promise<void>
  sendReportEmail(to: string[], report: any, type: string): Promise<void>
}
```
- **Propósito**: Envio de emails e relatórios
- **Configuração**:
  - SMTP Gmail
  - Porta 465 (SSL)
  - Suporte a TLS
- **Funcionalidades**:
  - Envio de emails genéricos
  - Envio de relatórios formatados
  - Suporte a anexos
  - Templates HTML
- **Segurança**:
  - Credenciais via env
  - Conexão segura
  - Validação de configuração

#### database.service.ts
```typescript
@Injectable()
export class DatabaseService {
  findAppointments(filters: any): Promise<any[]>
  updateAppointment(id: string, data: any): Promise<any>
  createAppointment(data: any): Promise<any>
  deleteAppointment(id: string): Promise<void>
}
```
- **Propósito**: Operações no banco de dados
- **Funcionalidades**:
  - CRUD de agendamentos
  - Filtros dinâmicos
  - Logging de operações
  - Tratamento de datas
- **Integrações**:
  - TypeORM
  - Sistema de logs
  - Cache (quando aplicável)

### Queue

#### queue.module.ts
```typescript
@Module({
  imports: [...],
  providers: [...],
  exports: [...]
})
export class QueueModule {}
```
- **Propósito**: Configuração do módulo de filas
- **Providers**:
  - QueueService
  - Processadores específicos
- **Configurações**:
  - Importações necessárias
  - Exportações de serviços
  - Configuração de processadores

#### queue.service.ts (Queue)
```typescript
@Injectable()
export class QueueService {
  private queue: QueueProcessor
  process(data: any): Promise<void>
}
```
- **Propósito**: Processamento de filas
- **Funcionalidades**:
  - Gerenciamento de fila
  - Processamento assíncrono
  - Retry em falhas
  - Logging de operações


### Queue Processors

#### report.processor.ts
```typescript
@Injectable()
export class ReportProcessor {
  process(job: Job<IReportQueueJob>): Promise<void>
  private generateCancellationReport(appointments: IAppointment[]): Promise<Buffer>
  private generateConfirmationReport(appointments: IAppointment[]): Promise<Buffer>
  private generateNoResponseReport(appointments: IAppointment[]): Promise<Buffer>
}
```
- **Propósito**: Processamento de relatórios em background
- **Funcionalidades**:
  - Geração de relatórios de cancelamentos
  - Geração de relatórios de confirmações
  - Geração de relatórios de sem resposta
  - Envio automático por email
- **Integrações**:
  - DatabaseService para busca de dados
  - EmailService para envio de relatórios
- **Características**:
  - Processamento assíncrono
  - Logging detalhado
  - Tratamento de erros
  - Suporte a múltiplos tipos de relatório

#### whatsapp.processor.ts
```typescript
@Injectable()
@Processor('whatsapp')
export class WhatsappProcessor {
  @Process()
  process(job: Job<IWhatsappQueueJob>): Promise<void>
  private sendWhatsappMessage(job: Job<IWhatsappQueueJob>): Promise<boolean>
}
```
- **Propósito**: Processamento de mensagens WhatsApp via Twilio
- **Funcionalidades**:
  - Envio de mensagens WhatsApp
  - Retry automático em caso de falha
  - Integração com Twilio
  - Validação de números
- **Configurações**:
  - Credenciais Twilio via ConfigService
  - Número de origem configurável
  - Limite de tentativas configurável
- **Integrações**:
  - Twilio API
  - DatabaseService para busca de dados
  - SchedulerService para reagendamento
- **Segurança**:
  - Validação de credenciais
  - Tratamento de erros
  - Logging de operações

#### notification.processor.ts
```typescript
@Injectable()
@Processor('notifications')
export class NotificationProcessor {
  @Process()
  handleNotification(job: Job<INotificationJob>): Promise<void>
  private handle40HourAppointment(job: Job<INotificationJob>): Promise<void>
  private handleAppointmentNotification(job: Job<INotificationJob>): Promise<void>
  private handleBusinessAreaReport(job: Job<INotificationJob>): Promise<void>
  private handleErrorAlert(job: Job<INotificationJob>): Promise<void>
  @Process('appointment_response')
  private handleAppointmentResponse(job: Job<INotificationJob>): Promise<void>
}
```
- **Propósito**: Processamento centralizado de notificações
- **Tipos de Notificação**:
  - Agendamentos (appointment)
  - Relatórios de área (business_area_report)
  - Alertas de erro (error_alert)
  - Notificações de 40h (appointment_40h)
  - Respostas de agendamento (appointment_response)
- **Funcionalidades**:
  - Processamento de diferentes tipos de notificação
  - Retry com delay exponencial
  - Integração com WhatsApp
  - Atualização de status de agendamentos
  - Geração de mensagens personalizadas
- **Características**:
  - Processamento assíncrono
  - Logging detalhado
  - Tratamento de erros robusto
  - Suporte a múltiplos fluxos
- **Integrações**:
  - QueueService para gerenciamento de filas
  - Sistema de agendamentos
  - Sistema de WhatsApp
  - Sistema de relatórios

### Middleware

#### logger.middleware.ts
```typescript
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function)
}
```
- **Propósito**: Logging de requisições HTTP
- **Funcionalidades**:
  - Log de método e URL
  - Tempo de resposta
  - Status code
  - Corpo da requisição (quando relevante)
- **Integrações**:
  - Sistema de logs
  - Métricas de performance

### Interfaces

#### api-response.interface.ts
```typescript
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```
- **Propósito**: Padronização de respostas da API
- **Campos**:
  - success: Status da operação
  - data: Dados da resposta
  - error: Mensagem de erro

#### queue.interface.ts
```typescript
export interface QueueProcessor {
  process(data: any): Promise<void>
}
```
- **Propósito**: Interface para processadores de fila
- **Métodos**:
  - process: Processamento de dados
- **Tipos**:
  - Data: Dados a serem processados
  - Retorno: Promise<void>

#### report.interface.ts
```typescript
export interface Report {
  data: any
  type: string
  format: string
}
```
- **Propósito**: Estrutura de relatórios
- **Campos**:
  - data: Dados do relatório
  - type: Tipo do relatório
  - format: Formato de saída

#### scheduler.interface.ts
```typescript
export interface Scheduler {
  schedule(task: Task): Promise<void>
  cancel(taskId: string): Promise<void>
}
```
- **Propósito**: Interface para agendamento de tarefas
- **Métodos**:
  - schedule: Agendamento de tarefa
  - cancel: Cancelamento de tarefa
- **Tipos**:
  - Task: Estrutura da tarefa
  - Retorno: Promise<void>

### Guards

#### client-token.guard.ts
```typescript
@Injectable()
export class ClientTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>
}
```
- **Propósito**: Proteção de rotas com token de cliente
- **Funcionalidades**:
  - Validação de token
  - Extração de cliente
  - Verificação de permissões
- **Segurança**:
  - Validação de token JWT
  - Verificação de expiração
  - Proteção contra tokens inválidos

#### client-token.module.ts
```typescript
@Module({
  imports: [...],
  providers: [...],
  exports: [...]
})
export class ClientTokenModule {}
```
- **Propósito**: Configuração do módulo de autenticação
- **Providers**:
  - ClientTokenGuard
  - Serviços relacionados
- **Configurações**:
  - Importações necessárias
  - Exportações de guardas

### Decorators

#### get-client.decorator.ts
```typescript
export const GetClient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {...}
)
```
- **Propósito**: Extração do cliente da requisição
- **Funcionalidades**:
  - Acesso ao cliente autenticado
  - Tipagem do cliente
  - Validação de contexto

#### public-route.decorator.ts
```typescript
export const PublicRoute = () => SetMetadata('isPublic', true)
```
- **Propósito**: Marcação de rotas públicas
- **Funcionalidades**:
  - Bypass de autenticação
  - Metadata para guards
- **Uso**:
  - Decorator de rota
  - Configuração de acesso

#### api-response.decorator.ts
```typescript
export const ApiResponse = (options?: ApiResponseOptions) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {...}
}
```
- **Propósito**: Formatação padronizada de respostas
- **Funcionalidades**:
  - Transformação de resposta
  - Tratamento de erros
  - Logging de operações
- **Opções**:
  - Configuração de formato
  - Tratamento de erros
  - Logging



