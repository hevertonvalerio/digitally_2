import { Logger, Injectable, Optional } from '@nestjs/common';
import { Job } from 'bull';
import { Process, Processor } from '@nestjs/bull';
import { IWhatsappQueueJob } from '../../interfaces/queue.interface';
import { DatabaseService } from '../../services/database.service';
import { SchedulerService } from '../../../scheduler/scheduler.service';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
@Processor('whatsapp')
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);
  private readonly twilioClient: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(
    @Optional() private readonly databaseService: DatabaseService,
    @Optional() private readonly schedulerService: SchedulerService,
    private readonly configService: ConfigService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    this.logger.debug(`Inicializando WhatsappProcessor com: SID=${accountSid}, FROM=${fromNumber}`);

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Credenciais do Twilio não configuradas');
    }

    this.twilioClient = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  @Process()
  async process(job: Job<IWhatsappQueueJob>): Promise<void> {
    const { appointmentId, message, retryCount = 0 } = job.data;
    this.logger.debug(`Processando job WhatsApp para agendamento ${appointmentId}: ${message}`);

    try {
      const success = await this.sendWhatsappMessage(job);

      if (!success && retryCount < 3 && this.schedulerService) {
        this.logger.warn(`Tentando reenviar mensagem para agendamento ${appointmentId} (tentativa ${retryCount + 1})`);
        await this.schedulerService.scheduleWhatsappNotification(
          appointmentId,
          message,
          retryCount + 1
        );
      } else if (!success && retryCount < 3) {
        this.logger.warn(`Não foi possível reagendar a mensagem WhatsApp para o agendamento ${appointmentId} porque o SchedulerService não está disponível`);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem WhatsApp: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async sendWhatsappMessage(job: Job<IWhatsappQueueJob>): Promise<boolean> {
    const { appointmentId, message, phoneNumber } = job.data;
    try {
      // Busca o número do paciente no job ou no banco de dados
      let targetPhone: string;
      
      if (phoneNumber) {
        targetPhone = phoneNumber;
      } else {
        if (!this.databaseService) {
          throw new Error('DatabaseService não disponível');
        }

        const appointment = await this.databaseService.findAppointments({ id: appointmentId });
        if (!appointment || !appointment[0] || !appointment[0].patientPhone) {
          throw new Error(`Agendamento ${appointmentId} não encontrado ou sem número de telefone`);
        }
        targetPhone = appointment[0].patientPhone;
      }

      this.logger.debug(`Enviando mensagem via Twilio para ${targetPhone}: ${message}`);

      // Envia a mensagem via Twilio
      const twilioMessage = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${targetPhone}`
      });

      this.logger.debug(`Resposta do Twilio: ${JSON.stringify(twilioMessage)}`);
      this.logger.log(`Mensagem WhatsApp enviada com sucesso para agendamento ${appointmentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem WhatsApp: ${error.message}`, error.stack);
      return false;
    }
  }
} 