import { Logger, Injectable, Optional } from '@nestjs/common';
import { Job } from 'bull';
import { IWhatsappQueueJob } from '../../interfaces/queue.interface';
import { DatabaseService } from '../../services/database.service';
import { SchedulerService } from '../../../scheduler/scheduler.service';

@Injectable()
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    @Optional() private readonly databaseService: DatabaseService,
    @Optional() private readonly schedulerService: SchedulerService,
  ) {}

  async process(job: Job<IWhatsappQueueJob>): Promise<void> {
    const { appointmentId, message, retryCount = 0 } = job.data;

    try {
      // Simula o envio da mensagem do WhatsApp
      const success = await this.sendWhatsappMessage(appointmentId, message);

      if (!success && retryCount < 3 && this.schedulerService) {
        // Agenda nova tentativa
        await this.schedulerService.scheduleWhatsappNotification(
          appointmentId,
          message,
          retryCount + 1
        );
      } else if (!success && retryCount < 3) {
        this.logger.warn(`Não foi possível reagendar a mensagem WhatsApp para o agendamento ${appointmentId} porque o SchedulerService não está disponível`);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem WhatsApp: ${error.message}`);
      throw error;
    }
  }

  private async sendWhatsappMessage(appointmentId: string, message: string): Promise<boolean> {
    // Simula 20% de chance de falha
    const success = Math.random() > 0.2;
    
    if (success) {
      this.logger.log(`Mensagem WhatsApp enviada com sucesso para agendamento ${appointmentId}`);
      return true;
    }

    this.logger.warn(`Falha ao enviar mensagem WhatsApp para agendamento ${appointmentId}`);
    return false;
  }
} 