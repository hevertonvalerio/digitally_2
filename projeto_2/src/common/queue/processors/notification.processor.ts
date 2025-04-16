import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Processor, Process } from '@nestjs/bull';
import { INotificationJob, IAppointmentNotification, IBusinessAreaReport, IErrorAlert, IWhatsappQueueJob } from '../../interfaces/queue.interface';
import { QueueService } from '../queue.service';

@Injectable()
@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly queueService: QueueService,
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
        case 'appointment_response':
          await this.handleAppointmentResponse(job);
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
      if (appointmentData.appointmentType === 'Procedure') {
        message = `Bom dia!\nO seu procedimento referente a ${appointmentData.specialty} está agendado para o dia ${appointmentData.appointmentDate}, às ${appointmentData.appointmentTime}. Deseja confirmar o procedimento?`;
      } else {
        message = `Bom dia!\nSua consulta referente a ${appointmentData.specialty} está agendada para o dia ${appointmentData.appointmentDate}, às ${appointmentData.appointmentTime}. Deseja confirmar a consulta?`;
      }

      // Adiciona à fila de WhatsApp
      await this.queueService.addWhatsappJob({
        appointmentId: appointmentData.appointmentId,
        message,
        retryCount: 0
      });

      // Marca notificação como enviada
      await this.queueService.markNotificationAsSent(appointmentData.appointmentId);
      
      this.logger.log(`Notificação de 40 horas enviada com sucesso para agendamento ${appointmentData.appointmentId}`);
    } catch (error) {
      this.logger.error(`Erro ao processar notificação de 40 horas: ${error.message}`);
      throw error;
    }
  }

  private async handleAppointmentNotification(job: Job<INotificationJob>) {
    const appointmentData = job.data.data as IAppointmentNotification;
    
    try {
      // Marca a notificação como enviada
      if (this.queueService) {
        await this.queueService.markNotificationAsSent(appointmentData.appointmentId);
      } else {
        this.logger.warn(`Não foi possível marcar a notificação como enviada para o agendamento ${appointmentData.appointmentId} porque o QueueService não está disponível`);
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

  @Process('appointment_response')
  private async handleAppointmentResponse(job: Job<INotificationJob>) {
    const responseData = job.data.data as IAppointmentNotification;
    this.logger.log(`Processando resposta de agendamento: ${JSON.stringify(responseData)}`);

    try {
      // Verifica se a resposta é válida
      const isValidResponse = responseData.response === 'Sim' || responseData.response === 'Não';
      
      if (!isValidResponse) {
        const retryCount = responseData.retryCount || 0;
        
        if (retryCount < 3) {
          // Reenviar a mensagem inicial
          this.logger.log(`Resposta inválida. Tentativa ${retryCount + 1} de 3.`);
          
          await this.queueService.addNotificationJob({
            type: 'appointment_40h',
            data: {
              ...responseData,
              retryCount: retryCount + 1
            }
          });
          return;
        } else {
          // Na quarta tentativa, envia mensagem final
          this.logger.log('Quarta tentativa com resposta inválida. Enviando mensagem final.');
          await this.queueService.addWhatsappJob({
            appointmentId: responseData.appointmentId,
            message: 'Não foi possível confirmar o agendamento. Por gentileza, entre em contato pelo telefone XXXX.',
            retryCount: 0
          });
          return;
        }
      }

      // Processa a resposta válida
      const status = responseData.response === 'Sim' ? 'confirmed' : 'cancelled';
      
      if (!responseData.response) {
        throw new Error('Resposta não pode ser undefined');
      }

      // Atualiza o status do agendamento
      await this.queueService.updateAppointmentStatus(responseData.appointmentId, {
        status,
        confirmationDate: responseData.receivedAt || new Date().toISOString(),
        confirmationResponse: responseData.response
      });

      // Busca os dados completos do agendamento
      const appointment = await this.queueService.getAppointmentById(responseData.appointmentId);
      if (!appointment) {
        throw new Error(`Agendamento ${responseData.appointmentId} não encontrado`);
      }

      // Envia mensagem de confirmação usando o número que enviou a mensagem
      let confirmationMessage: string;
      if (status === 'confirmed') {
        confirmationMessage = appointment.examProtocol 
          ? `Agradecemos o seu retorno. O agendamento foi realizado para a data ${appointment.appointmentDate}, às ${appointment.appointmentTime}. Segue o preparo do exame.`
          : `Agradecemos o seu retorno. O agendamento foi realizado para a data ${appointment.appointmentDate}, às ${appointment.appointmentTime}.`;
      } else {
        confirmationMessage = 'Agradecemos o seu retorno. O agendamento foi desmarcado. Caso queira marcar um novo agendamento, entre em contato com a unidade básica de saúde da sua região.';
      }

      // Remove o prefixo 'whatsapp:' se existir
      const phoneNumber = responseData.patientPhone.replace('whatsapp:', '');

      await this.queueService.addWhatsappJob({
        appointmentId: responseData.appointmentId,
        message: confirmationMessage,
        retryCount: 0,
        phoneNumber // Adiciona o número do telefone que enviou a mensagem
      });

      this.logger.log(`Resposta de agendamento processada com sucesso: ${status}`);
    } catch (error) {
      this.logger.error(`Erro ao processar resposta de agendamento: ${error.message}`);
      throw error;
    }
  }
} 