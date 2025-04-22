import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as twilio from 'twilio';
import { WebhookRequestDto } from './dto/webhook-request.dto';
import { PhoneValidatorService } from '../common/services/phone-validator.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { QueueService } from '../common/queue/queue.service';
import { Client } from '../clients/entities/client.entity';
import { Notification } from '../notifications/entities/notification.entity';
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
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
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
      const [name, dateTime] = text.split('você confirma sua consulta para ');
      const [date, time] = dateTime.split(' às ');

      const twilioClient = this.getTwilioClient(client);

      // Extrai apenas a data e hora para as variáveis do template
      const dateStr = date.trim();
      const timeStr = time.replace('?', '').trim();

      this.logger.debug(`Enviando mensagem WhatsApp:
        De: ${client.twilioFromNumber}
        Para: ${to}
        ContentSid: ${process.env.TWILIO_CONTENT_SID}
        Variáveis: ${JSON.stringify({
          1: dateStr,
          2: timeStr
        })}
      `);

      const message = await twilioClient.messages.create({
        from: `whatsapp:${client.twilioFromNumber}`,
        to: `whatsapp:${to}`,
        contentSid: process.env.TWILIO_CONTENT_SID || '',
        contentVariables: JSON.stringify({
          1: dateStr,
          2: timeStr
        })
      });

      // Criar notificação inicial
      const notification = new Notification();
      notification.clientId = client.id;
      notification.messageType = 'appointment_confirmation';
      notification.status = 'sent';
      notification.whatsappMessageId = message.sid;
      notification.templateUsed = process.env.TWILIO_CONTENT_SID || '';
      notification.sentAt = new Date();
      notification.response = '';

      const savedNotification = await this.notificationRepository.save(notification);

      this.logger.log(`Mensagem enviada com sucesso: ${message.sid}`);
      return {
        success: true,
        messageId: message.sid,
        notificationId: savedNotification.id
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
    // Criar o agendamento no banco de dados
    const newAppointment = {
      id: Date.now(), // Usando timestamp como ID numérico
      patientName: appointmentData.patientName,
      patientPhone: to,
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
      
      // Atualizar a notificação com o ID do agendamento
      if (messageResult.notificationId) {
        const notification = await this.notificationRepository.findOne({
          where: { id: messageResult.notificationId }
        });
        
        if (notification) {
          notification.appointmentId = appointment.id;
          await this.notificationRepository.save(notification);
        }
      }
    }

    return messageResult;
  }

  async handleWebhook(webhookData: WebhookRequestDto) {
    this.logger.log('Recebendo webhook: ' + JSON.stringify(webhookData));

    try {
      this.logger.log('1. Buscando cliente pelo AccountSid');
      if (!webhookData.AccountSid) {
        throw new Error('AccountSid não fornecido');
      }

      const client = await this.clientRepository.findOne({
        where: { twilioAccountSid: webhookData.AccountSid }
      });
      this.logger.log('2. Resultado da busca de cliente: ' + JSON.stringify(client));

      if (!client) {
        throw new Error('Cliente não encontrado para o AccountSid fornecido');
      }

      this.logger.log('3. Validando formato da mensagem');
      if (!this.isValidWebhookMessage(webhookData)) {
        this.logger.warn('Mensagem inválida recebida.');
        await this.handleInvalidMessage(webhookData);
        return {
          success: false,
          error: 'Invalid message format',
        };
      }

      this.logger.log('4. Buscando agendamento por telefone');
      const appointment = await this.findAppointmentByPhone(webhookData.From);
      this.logger.log('5. Resultado da busca de agendamento: ' + JSON.stringify(appointment));

      if (!appointment) {
        this.logger.warn('Nenhum agendamento encontrado para o telefone: ' + webhookData.From);
        await this.handleNoAppointmentFound(webhookData);
        return {
          success: false,
          error: 'No appointment found',
        };
      }

      this.logger.log('6. Processando resposta do botão');
      if (webhookData.ButtonText) {
        await this.processButtonResponse(webhookData, Number(appointment.id));
      } else if (webhookData.MessageStatus || webhookData.SmsStatus) {
        // Atualizar status da notificação
        const notification = await this.notificationRepository.findOne({
          where: { whatsappMessageId: webhookData.MessageSid }
        });

        if (notification) {
          notification.status = webhookData.MessageStatus || webhookData.SmsStatus;
          await this.notificationRepository.save(notification);
        }
      }

      this.logger.log('7. Atualizando agendamento');
      await this.schedulerService.updateAppointment(Number(appointment.id), {
        lastInteraction: new Date(),
        lastStatus: webhookData.MessageStatus || webhookData.SmsStatus,
        lastResponse: webhookData.ButtonText || ''
      });

      this.logger.log('8. Finalizando processamento com sucesso!');
      return {
        success: true,
        message: `Webhook processed for message ${webhookData.MessageSid}`,
        status: webhookData.MessageStatus || webhookData.SmsStatus,
        buttonResponse: webhookData.ButtonText
      };
    } catch (error) {
      this.logger.error('Erro no processamento: ' + error.message, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private isValidWebhookMessage(webhookData: WebhookRequestDto): boolean {
    this.logger.debug('Validando campos da mensagem:', webhookData);
    return !!(
      webhookData.MessageSid &&
      webhookData.From &&
      (webhookData.MessageStatus || webhookData.SmsStatus)  // Aceita tanto MessageStatus quanto SmsStatus
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
    this.logger.log(`Buscando agendamento para o telefone: ${phone}`);
    
    // Remove o prefixo 'whatsapp:' e formata o número
    const formattedPhone = phone.replace('whatsapp:', '');
    this.logger.log(`Número formatado para busca: ${formattedPhone}`);
    
    try {
      const appointments = await this.schedulerService.getAppointments({
        patientPhone: formattedPhone,
        status: 'scheduled'
      });
      this.logger.log(`Agendamentos encontrados: ${JSON.stringify(appointments)}`);

      if (appointments.length === 0) {
        this.logger.warn('Nenhum agendamento encontrado');
        return null;
      }

      this.logger.log(`Retornando primeiro agendamento: ${JSON.stringify(appointments[0])}`);
      return appointments[0];
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamento: ${error.message}`);
      throw error;
    }
  }

  private async processButtonResponse(webhookData: WebhookRequestDto, appointmentId: number) {
    this.logger.log(`Iniciando processamento de resposta do botão para agendamento ${appointmentId}`);
    
    const status = webhookData.ButtonText === 'Sim' ? 'confirmed' : 'cancelled';
    this.logger.log(`Status definido como: ${status}`);
    
    try {
      this.logger.log('Atualizando status do agendamento');
      await this.schedulerService.updateAppointment(appointmentId, {
        status,
        confirmationDate: new Date(),
        confirmationResponse: webhookData.ButtonText || ''
      });
      this.logger.log('Status do agendamento atualizado com sucesso');

      // Buscar a notificação mais recente para este número
      const formattedPhone = webhookData.From.replace('whatsapp:', '');
      const notification = await this.notificationRepository.findOne({
        where: {
          status: 'sent',
          appointment: { patientPhone: formattedPhone }
        },
        order: { sentAt: 'DESC' },
        relations: ['appointment']
      });

      if (notification) {
        notification.status = 'responded';
        notification.response = webhookData.ButtonText || '';
        notification.responseAt = new Date();
        await this.notificationRepository.save(notification);
      }

      const notificationData: IAppointmentNotification = {
        appointmentId,
        patientName: '', // Será preenchido pelo serviço
        patientPhone: webhookData.From,
        appointmentDate: '', // Será preenchido pelo serviço
        appointmentTime: '', // Será preenchido pelo serviço
        response: webhookData.ButtonText || '',
        messageId: webhookData.MessageSid,
        receivedAt: new Date().toISOString()
      };

      this.logger.log('Adicionando notificação à fila');
      await this.queueService.addNotificationJob({
        type: 'appointment_response',
        data: notificationData,
        priority: 1
      });
      this.logger.log('Notificação adicionada à fila com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao processar resposta do botão: ${error.message}`);
      throw error; // Re-throw para ser capturado pelo try-catch do handleWebhook
    }
  }

  /**
   * Verifica se um número é válido para WhatsApp
   */
  isValidWhatsAppNumber(phone: string): boolean {
    return this.phoneValidator.isCellPhone(phone);
  }
}
