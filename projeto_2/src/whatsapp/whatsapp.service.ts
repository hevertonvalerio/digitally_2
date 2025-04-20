import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as twilio from 'twilio';
import { WebhookRequestDto } from './dto/webhook-request.dto';
import { PhoneValidatorService } from '../common/services/phone-validator.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { QueueService } from '../common/queue/queue.service';
import { Client } from '../clients/entities/client.entity';
import { 
  IPAQueueJob, 
  IDiscardedMessage, 
  IAppointmentNotification, 
  INotificationJob 
} from '../common/interfaces/queue.interface';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private clientsMap: Map<number, twilio.Twilio> = new Map();

  constructor(
    private readonly phoneValidator: PhoneValidatorService,
    private readonly schedulerService: SchedulerService,
    private readonly queueService: QueueService,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  onModuleInit() {
    // Inicialização do módulo
    this.logger.log('WhatsappService initialized');
  }

  private validateTwilioConfig(client: Client) {
    if (!client.twilioAccountSid || !client.twilioAuthToken) {
      throw new Error('Credenciais do Twilio não configuradas para o cliente');
    }
    
    if (!client.twilioFromNumber) {
      throw new Error('Número do WhatsApp não configurado para o cliente');
    }

    // Valida formato do número
    if (!client.twilioFromNumber.startsWith('+')) {
      throw new Error('Número do WhatsApp deve começar com + e incluir código do país (ex: +5511999999999)');
    }

    this.logger.debug(`Configuração Twilio do cliente ${client.id}:
      AccountSid: ${client.twilioAccountSid}
      FromNumber: ${client.twilioFromNumber}
    `);
  }

  private getTwilioClient(client: Client): twilio.Twilio {
    this.validateTwilioConfig(client);

    if (!this.clientsMap.has(client.id)) {
      this.clientsMap.set(client.id, twilio(client.twilioAccountSid, client.twilioAuthToken));
    }
    
    const twilioClient = this.clientsMap.get(client.id);
    if (!twilioClient) {
      throw new Error('Falha ao inicializar cliente Twilio');
    }
    
    return twilioClient;
  }

  async sendInteractiveMessage(client: Client, to: string, text: string, buttons: Array<{ title: string; id: string }>) {
    try {
      if (!this.phoneValidator.isCellPhone(to)) {
        throw new BadRequestException('O número fornecido não é um celular válido');
      }

      // Formata o número para o padrão WhatsApp
      const formattedNumber = this.phoneValidator.formatToWhatsApp(to);
      const [name, dateTime] = text.split('você confirma sua consulta para ');
      const [date, time] = dateTime.split(' às ');

      const twilioClient = this.getTwilioClient(client);
      // Adiciona o prefixo whatsapp: se não existir
      const fromNumber = client.twilioFromNumber.startsWith('whatsapp:') 
        ? client.twilioFromNumber 
        : `whatsapp:${client.twilioFromNumber}`;
      
      const toNumber = formattedNumber.startsWith('whatsapp:') 
        ? formattedNumber 
        : `whatsapp:${formattedNumber}`;

      // Extrai apenas a data e hora para as variáveis do template
      const dateStr = date.trim();
      const timeStr = time.replace('?', '').trim();

      this.logger.debug(`Enviando mensagem WhatsApp:
        De: ${fromNumber}
        Para: ${toNumber}
        ContentSid: ${process.env.TWILIO_CONTENT_SID}
        Variáveis: ${JSON.stringify({
          1: dateStr,
          2: timeStr
        })}
      `);

      const message = await twilioClient.messages.create({
        from: fromNumber,
        to: toNumber,
        contentSid: process.env.TWILIO_CONTENT_SID || '',
        contentVariables: JSON.stringify({
          1: dateStr,
          2: timeStr
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

  async sendAppointmentConfirmation(client: Client, to: string, appointmentData: {
    patientName: string;
    date: string;
    time: string;
  }) {
    // Valida se é um número de celular antes de tentar enviar
    if (!this.phoneValidator.isCellPhone(to)) {
      throw new BadRequestException('O número fornecido não é um celular válido');
    }

    // Criar o agendamento no banco de dados
    const newAppointment = {
      id: Date.now(), // Usando timestamp como ID numérico
      patientName: appointmentData.patientName,
      patientPhone: this.phoneValidator.formatToWhatsApp(to),
      appointmentDate: new Date(appointmentData.date),
      appointmentTime: appointmentData.time,
      status: 'scheduled' as const,
      notificationSent: false,
      specialty: 'Consulta Geral', // Valor padrão
      appointmentType: 'consultation' as const, // Valor padrão
      cpf: '', // Será preenchido posteriormente
      clientId: client.id,
      createdAt: new Date()
    };

    const appointment = await this.schedulerService.createAppointment(newAppointment);

    const text = `Olá ${appointmentData.patientName}, você confirma sua consulta para ${appointmentData.date} às ${appointmentData.time}?`;
    
    const messageResult = await this.sendInteractiveMessage(client, to, text, [
      { title: 'Sim', id: 'confirm_appointment' },
      { title: 'Não', id: 'cancel_appointment' }
    ]);

    if (messageResult.success) {
      await this.schedulerService.markNotificationSent(Number(appointment.id));
    }

    return messageResult;
  }

  async handleWebhook(webhookData: WebhookRequestDto) {
    this.logger.log(`Recebendo webhook: ${JSON.stringify(webhookData)}`);

    try {
      // 1. Validação do AccountSid e busca do cliente
      if (!webhookData.AccountSid) {
        throw new Error('AccountSid não fornecido');
      }

      const client = await this.clientRepository.findOne({
        where: { twilioAccountSid: webhookData.AccountSid }
      });

      if (!client) {
        throw new Error('Cliente não encontrado para o AccountSid fornecido');
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
        await this.processButtonResponse(webhookData, Number(appointment.id));
      }

      // 5. Registro do retorno
      await this.schedulerService.updateAppointment(Number(appointment.id), {
        lastInteraction: new Date(),
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

  private async processButtonResponse(webhookData: WebhookRequestDto, appointmentId: number) {
    const status = webhookData.ButtonText === 'Sim' ? 'confirmed' : 'cancelled';
    
    await this.schedulerService.updateAppointment(appointmentId, {
      status,
      confirmationDate: new Date(),
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
