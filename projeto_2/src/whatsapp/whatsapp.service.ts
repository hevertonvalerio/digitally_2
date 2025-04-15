import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import * as twilio from 'twilio';
import { WebhookRequestDto } from './dto/webhook-request.dto';
import { PhoneValidatorService } from '../common/services/phone-validator.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { QueueService } from '../common/queue/queue.service';
import { 
  IPAQueueJob, 
  IDiscardedMessage, 
  IAppointmentNotification, 
  INotificationJob 
} from '../common/interfaces/queue.interface';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private client: twilio.Twilio;
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(
    private readonly phoneValidator: PhoneValidatorService,
    private readonly schedulerService: SchedulerService,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    this.validateEnvironmentVariables();
    this.initializeTwilioClient();
  }

  private validateEnvironmentVariables() {
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_FROM_NUMBER,
    } = process.env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      throw new Error('Missing required environment variables for Twilio configuration');
    }

    this.accountSid = TWILIO_ACCOUNT_SID;
    this.authToken = TWILIO_AUTH_TOKEN;
    this.fromNumber = TWILIO_FROM_NUMBER;
  }

  private initializeTwilioClient() {
    this.client = twilio(this.accountSid, this.authToken);
  }

  async sendInteractiveMessage(to: string, text: string, buttons: Array<{ title: string; id: string }>) {
    try {
      if (!this.phoneValidator.isCellPhone(to)) {
        throw new BadRequestException('O número fornecido não é um celular válido');
      }

      // Formata o número para o padrão WhatsApp
      const formattedNumber = this.phoneValidator.formatToWhatsApp(to);
      const [name, dateTime] = text.split('você confirma sua consulta para ');
      const [date, time] = dateTime.split(' às ');

      const message = await this.client.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${formattedNumber}`,
        contentSid: process.env.TWILIO_CONTENT_SID,
        contentVariables: JSON.stringify({
          1: name.replace('Olá ', '').trim(),
          2: date.trim(),
          3: time.replace('?', '').trim()
        })
      });

      this.logger.log(`Mensagem enviada com sucesso: ${message.sid}`);
      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendAppointmentConfirmation(to: string, appointmentData: {
    patientName: string;
    date: string;
    time: string;
  }) {
    // Valida se é um número de celular antes de tentar enviar
    if (!this.phoneValidator.isCellPhone(to)) {
      throw new BadRequestException('O número fornecido não é um celular válido');
    }

    const text = `Olá ${appointmentData.patientName}, você confirma sua consulta para ${appointmentData.date} às ${appointmentData.time}?`;
    
    return this.sendInteractiveMessage(to, text, [
      { title: 'Sim', id: 'confirm_appointment' },
      { title: 'Não', id: 'cancel_appointment' }
    ]);
  }

  async handleWebhook(webhookData: WebhookRequestDto) {
    this.logger.log(`Recebendo webhook: ${JSON.stringify(webhookData)}`);

    try {
      // 1. Validação do AccountSid
      if (webhookData.AccountSid !== this.accountSid) {
        throw new Error('Invalid AccountSid');
      }

      // 2. Validação da mensagem
      if (!this.isValidWebhookMessage(webhookData)) {
        await this.handleInvalidMessage(webhookData);
        return {
          success: false,
          error: 'Invalid message format',
        };
      }

      // 3. Busca e validação da agenda
      const appointment = await this.findAppointmentByPhone(webhookData.From);
      
      if (!appointment) {
        await this.handleNoAppointmentFound(webhookData);
        return {
          success: false,
          error: 'No appointment found',
        };
      }

      // 4. Processamento da resposta
      if (webhookData.ButtonText) {
        await this.processButtonResponse(webhookData, appointment.id);
      }

      // 5. Registro do retorno
      await this.schedulerService.updateAppointment(appointment.id, {
        lastInteraction: new Date().toISOString(),
        lastStatus: webhookData.MessageStatus,
        lastResponse: webhookData.ButtonText || undefined,
      });

      return {
        success: true,
        message: `Webhook processed for message ${webhookData.MessageSid}`,
        status: webhookData.MessageStatus,
        buttonResponse: webhookData.ButtonText
      };
    } catch (error) {
      this.logger.error(`Erro ao processar webhook: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private isValidWebhookMessage(webhookData: WebhookRequestDto): boolean {
    return !!(
      webhookData.MessageSid &&
      webhookData.From &&
      webhookData.MessageStatus
    );
  }

  private async handleInvalidMessage(webhookData: WebhookRequestDto) {
    this.logger.warn(`Mensagem inválida recebida: ${JSON.stringify(webhookData)}`);
    
    const discardedMessage: IDiscardedMessage = {
      messageId: webhookData.MessageSid,
      from: webhookData.From,
      content: webhookData.ButtonText,
      receivedAt: new Date().toISOString(),
      reason: 'invalid_message_format'
    };

    await this.queueService.addNotificationJob({
      type: 'discarded_message',
      data: discardedMessage
    });
  }

  private async handleNoAppointmentFound(webhookData: WebhookRequestDto) {
    this.logger.warn(`Nenhum agendamento encontrado para: ${webhookData.From}`);
    
    const discardedMessage: IDiscardedMessage = {
      messageId: webhookData.MessageSid,
      from: webhookData.From,
      content: webhookData.ButtonText,
      receivedAt: new Date().toISOString(),
      reason: 'no_appointment_found'
    };

    await this.queueService.addNotificationJob({
      type: 'discarded_message',
      data: discardedMessage
    });
  }

  private async findAppointmentByPhone(phone: string) {
    // Remove o prefixo 'whatsapp:' e formata o número
    const formattedPhone = phone.replace('whatsapp:', '');
    
    const appointments = await this.schedulerService.getAppointments({
      patientPhone: formattedPhone,
      status: 'scheduled'
    });

    return appointments[0] || null;
  }

  private async processButtonResponse(webhookData: WebhookRequestDto, appointmentId: string) {
    const status = webhookData.ButtonText === 'Sim' ? 'confirmed' : 'cancelled';
    
    await this.schedulerService.updateAppointment(appointmentId, {
      status,
      confirmationDate: new Date().toISOString(),
      confirmationResponse: webhookData.ButtonText
    });

    const notification: IAppointmentNotification = {
      appointmentId,
      patientName: '', // Será preenchido pelo serviço
      patientPhone: webhookData.From,
      appointmentDate: '', // Será preenchido pelo serviço
      appointmentTime: '', // Será preenchido pelo serviço
      response: webhookData.ButtonText,
      messageId: webhookData.MessageSid,
      receivedAt: new Date().toISOString()
    };

    await this.queueService.addNotificationJob({
      type: 'appointment_response',
      data: notification,
      priority: 1
    });
  }

  /**
   * Verifica se um número é válido para WhatsApp
   */
  isValidWhatsAppNumber(phone: string): boolean {
    return this.phoneValidator.isCellPhone(phone);
  }
}
