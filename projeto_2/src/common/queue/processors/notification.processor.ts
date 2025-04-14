import { Injectable, Logger, Optional } from '@nestjs/common';
import { Job } from 'bull';
import { Processor, Process } from '@nestjs/bull';
import { INotificationJob, IAppointmentNotification, IBusinessAreaReport, IErrorAlert, IWhatsappQueueJob } from '../../interfaces/queue.interface';
import { QueueService } from '../queue.service';
import { SchedulerService } from '../../../scheduler/scheduler.service';

@Injectable()
@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Optional() private readonly queueService: QueueService,
    @Optional() private readonly schedulerService: SchedulerService,
  ) {}

  @Process()
  async handleNotification(job: Job<INotificationJob>) {
    this.logger.debug(`Processando notificação: ${job.data.type}`);

    try {
      switch (job.data.type) {
        case 'appointment':
          await this.handleAppointmentNotification(job);
          break;
        case 'business_area_report':
          await this.handleBusinessAreaReport(job);
          break;
        case 'error_alert':
          await this.handleErrorAlert(job);
          break;
        case 'appointment_40h':
          await this.handle40HourAppointment(job);
          break;
        default:
          this.logger.warn(`Tipo de notificação desconhecido: ${job.data.type}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar notificação: ${error.message}`, error.stack);
      
      // Incrementa o contador de tentativas
      const notificationData = job.data.data as IAppointmentNotification;
      if (notificationData.retryCount !== undefined) {
        notificationData.retryCount++;
        
        // Se ainda não atingiu o número máximo de tentativas, reagenda
        if (notificationData.retryCount < (job.opts.attempts || 3)) {
          this.logger.log(`Tentativa ${notificationData.retryCount + 1} de envio para ${notificationData.patientName}`);
          
          // Calcula o delay exponencial (1min, 5min, 15min)
          const delayMinutes = Math.pow(5, notificationData.retryCount);
          const delayMs = delayMinutes * 60 * 1000;
          
          if (this.queueService) {
            await this.queueService.addNotificationJob({
              ...job.data,
              data: notificationData,
              priority: job.opts.priority,
              attempts: job.opts.attempts
            });
          } else {
            this.logger.warn(`Não foi possível reagendar a notificação porque o QueueService não está disponível`);
          }
          
          return;
        }
      }
      
      throw error;
    }
  }

  private async handle40HourAppointment(job: Job<INotificationJob>) {
    const appointmentData = job.data.data as IAppointmentNotification;
    this.logger.log(`Processando notificação de 40 horas para agendamento ${appointmentData.appointmentId}`);

    try {
      // Prepara a mensagem baseada no tipo de agendamento
      let message: string;
      if (appointmentData.appointmentType === 'Consultation') {
        message = `Bom dia!\nSua consulta referente a ${appointmentData.specialty} está agendada para o dia ${appointmentData.appointmentDate}, às ${appointmentData.appointmentTime}. Deseja confirmar a consulta?`;
      } else {
        message = `Bom dia!\nO seu procedimento referente a ${appointmentData.specialty} está agendado para o dia ${appointmentData.appointmentDate}, às ${appointmentData.appointmentTime}. Deseja confirmar o procedimento?`;
      }

      // Cria o job do WhatsApp
      const whatsappJob: IWhatsappQueueJob = {
        appointmentId: appointmentData.appointmentId,
        message,
        retryCount: 0
      };

      if (this.queueService) {
        await this.queueService.addWhatsappJob(whatsappJob);
      } else {
        this.logger.warn(`Não foi possível adicionar o job de WhatsApp à fila porque o QueueService não está disponível`);
      }

      // Marca notificação como enviada
      if (this.queueService) {
        await this.queueService.markNotificationAsSent(appointmentData.appointmentId);
      } else {
        this.logger.warn(`Não foi possível marcar a notificação como enviada porque o QueueService não está disponível`);
      }
      
      this.logger.log(`Notificação de 40 horas enviada com sucesso para agendamento ${appointmentData.appointmentId}`);
    } catch (error) {
      this.logger.error(`Erro ao processar notificação de 40 horas para agendamento ${appointmentData.appointmentId}:`, error);
      throw error;
    }
  }

  private async handleAppointmentNotification(job: Job<INotificationJob>) {
    const appointmentData = job.data.data as IAppointmentNotification;
    
    try {
      // Marca a notificação como enviada
      if (this.schedulerService) {
        await this.schedulerService.markNotificationSent(appointmentData.appointmentId);
      } else {
        this.logger.warn(`Não foi possível marcar a notificação como enviada para o agendamento ${appointmentData.appointmentId} porque o SchedulerService não está disponível`);
      }
      
      this.logger.log(`Notificação de agendamento processada com sucesso para ${appointmentData.patientName}`);
    } catch (error) {
      this.logger.error(`Erro ao processar notificação de agendamento: ${error.message}`);
      throw error;
    }
  }

  private async handleBusinessAreaReport(job: Job<INotificationJob>) {
    const report = job.data.data as IBusinessAreaReport;
    this.logger.log(`Processando relatório de área de negócio: ${report.date}`);
    // ... implementação do processamento do relatório ...
  }

  private async handleErrorAlert(job: Job<INotificationJob>) {
    const error = job.data.data as IErrorAlert;
    this.logger.log(`Processando alerta de erro: ${error.error}`);
    // ... implementação do processamento do alerta de erro ...
  }
} 