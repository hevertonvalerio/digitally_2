import { Logger, Injectable, Optional } from '@nestjs/common';
import { Job } from 'bull';
import { IReportQueueJob } from '../../interfaces/queue.interface';
import { IAppointment } from '../../interfaces/scheduler.interface';
import { DatabaseService } from '../../services/database.service';
import { EmailService } from '../../services/email.service';

@Injectable()
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    @Optional() private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

  async process(job: Job<IReportQueueJob>): Promise<void> {
    const { reportType, date } = job.data;

    try {
      let reportBuffer: Buffer;
      let appointments: IAppointment[] = [];

      if (this.databaseService) {
        appointments = await this.databaseService.getAppointments({
          date,
          status: reportType === 'cancellation' ? 'cancelled' : 
                 reportType === 'confirmation' ? 'confirmed' : undefined
        });
      } else {
        this.logger.warn('DatabaseService não está disponível para gerar relatório');
      }

      switch (reportType) {
        case 'cancellation':
          reportBuffer = await this.generateCancellationReport(appointments);
          break;
        case 'confirmation':
          reportBuffer = await this.generateConfirmationReport(appointments);
          break;
        case 'no_response':
          reportBuffer = await this.generateNoResponseReport(appointments);
          break;
        default:
          throw new Error(`Tipo de relatório inválido: ${reportType}`);
      }

      await this.emailService.sendReportEmail(
        [process.env.BUSINESS_EMAIL || 'business@example.com'],
        `Relatório de ${reportType}`,
        reportBuffer,
        'pdf'
      );

      this.logger.log(`Relatório ${reportType} gerado e enviado com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao processar relatório: ${error.message}`);
      throw error;
    }
  }

  private async generateCancellationReport(appointments: IAppointment[]): Promise<Buffer> {
    // Implementação do relatório de cancelamentos
    return Buffer.from('Relatório de Cancelamentos');
  }

  private async generateConfirmationReport(appointments: IAppointment[]): Promise<Buffer> {
    // Implementação do relatório de confirmações
    return Buffer.from('Relatório de Confirmações');
  }

  private async generateNoResponseReport(appointments: IAppointment[]): Promise<Buffer> {
    // Implementação do relatório de sem resposta
    return Buffer.from('Relatório de Sem Resposta');
  }
} 