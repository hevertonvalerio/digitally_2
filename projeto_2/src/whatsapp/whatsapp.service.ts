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
import { ConfigService } from '@nestjs/config';
import { IAppointment } from '../common/interfaces/scheduler.interface';

interface TwilioConfig {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
}

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
    private readonly configService: ConfigService,
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

  private getTwilioClient(config: TwilioConfig): twilio.Twilio {
    return twilio(config.twilioAccountSid, config.twilioAuthToken);
  }

  async sendInteractiveMessage(client: Client, to: string, text: string, buttons: Array<{ title: string; id: string }>, appointmentType: 'procedure' | 'consultation' = 'consultation', patientName: string = '', specialty: string = '') {
    try {
      if (!this.phoneValidator.isCellPhone(to)) {
        throw new BadRequestException('O número fornecido não é um celular válido');
      }

      // Formata o número para o padrão WhatsApp
      const formattedNumber = this.phoneValidator.formatToWhatsApp(to);
      
      // Extrair data e hora do texto da mensagem, considerando os diferentes tipos de agendamento
      let dateStr = '';
      let timeStr = '';
      
      // Extrair data e hora do texto da mensagem
      if (text.includes('você confirma seu procedimento para')) {
        const [_, dateTime] = text.split('você confirma seu procedimento para ');
        if (dateTime) {
          const [datePart, timePart] = dateTime.split(' às ');
          dateStr = datePart.trim();
          timeStr = timePart ? timePart.replace('?', '').trim() : '';
        }
      } else if (text.includes('você confirma sua consulta para')) {
        const [_, dateTime] = text.split('você confirma sua consulta para ');
        if (dateTime) {
          const [datePart, timePart] = dateTime.split(' às ');
          dateStr = datePart.trim();
          timeStr = timePart ? timePart.replace('?', '').trim() : '';
        }
      } else {
        // Fallback para outros formatos de texto
        const matches = text.match(/para ([0-9/]+) às ([0-9:]+)\??/);
        if (matches && matches.length >= 3) {
          dateStr = matches[1].trim();
          timeStr = matches[2].trim();
        }
      }

      const twilioClient = this.getTwilioClient({
        twilioAccountSid: client.twilioAccountSid,
        twilioAuthToken: client.twilioAuthToken,
        twilioFromNumber: client.twilioFromNumber
      });
      
      // Adiciona o prefixo whatsapp: se não existir
      const fromNumber = client.twilioFromNumber.startsWith('whatsapp:') 
        ? client.twilioFromNumber 
        : `whatsapp:${client.twilioFromNumber}`;
      
      const toNumber = formattedNumber.startsWith('whatsapp:') 
        ? formattedNumber 
        : `whatsapp:${formattedNumber}`;

      const baseUrl = process.env.BASE_URL || 'https://4d2d-177-23-123-9.ngrok-free.app';
      const webhookUrl = `${baseUrl}/api/whatsapp/webhook`;
      
      this.logger.log(`Configurando webhook para: ${webhookUrl}`);
      this.logger.log(`Enviando mensagem WhatsApp:
        De: ${fromNumber}
        Para: ${toNumber}
        ContentSid: ${process.env.TWILIO_CONTENT_SID}
        Webhook URL: ${webhookUrl}
        Tipo: ${appointmentType}
        Variáveis: ${JSON.stringify({
          1: patientName,
          2: appointmentType === 'procedure' ? 'procedimento' : 'consulta',
          3: specialty,
          4: dateStr,
          5: timeStr
        })}`);
      
      // Garantir que o webhook está configurado corretamente
      try {
        // Verificar se o webhook já está configurado para este número
        const services = await twilioClient.messaging.v1.services.list();
        let serviceFound = false;
        
        for (const service of services) {
          if (service.friendlyName === 'Digitaly Webhook Service') {
            serviceFound = true;
            this.logger.log(`Serviço de webhook já existe: ${service.sid}`);
            
            // Atualizar o webhook URL
            await twilioClient.messaging.v1.services(service.sid).update({
              inboundRequestUrl: webhookUrl,
              statusCallback: webhookUrl
            });
            
            this.logger.log(`Webhook URL atualizado para: ${webhookUrl}`);
            break;
          }
        }
        
        if (!serviceFound) {
          this.logger.log('Criando novo serviço de webhook...');
          const service = await twilioClient.messaging.v1.services.create({
            friendlyName: 'Digitaly Webhook Service',
            inboundRequestUrl: webhookUrl,
            statusCallback: webhookUrl
          });
          
          this.logger.log(`Novo serviço de webhook criado: ${service.sid}`);
          
          // Associar o número ao serviço
          const phoneNumber = client.twilioFromNumber.replace('whatsapp:', '');
          await twilioClient.messaging.v1.services(service.sid)
            .phoneNumbers.create({ phoneNumberSid: phoneNumber });
            
          this.logger.log(`Número ${phoneNumber} associado ao serviço de webhook`);
        }
      } catch (error) {
        this.logger.warn(`Erro ao configurar webhook: ${error.message}`);
        // Continua mesmo com erro na configuração do webhook
      }

      const message = await twilioClient.messages.create({
        from: fromNumber,
        to: toNumber,
        contentSid: process.env.TWILIO_CONTENT_SID || '',
        contentVariables: JSON.stringify({
          1: patientName,
          2: appointmentType === 'procedure' ? 'procedimento' : 'consulta',
          3: specialty,
          4: dateStr,
          5: timeStr
        }),
        statusCallback: webhookUrl
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
    appointmentType?: 'procedure' | 'consultation';
    specialty?: string;
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
      specialty: appointmentData.specialty, // Removido valor padrão
      appointmentType: appointmentData.appointmentType || 'consultation',
      cpf: '', // Será preenchido posteriormente
      clientId: client.id,
      createdAt: new Date()
    };

    const appointment = await this.schedulerService.createAppointment(newAppointment);

    const tipoAgendamento = appointmentData.appointmentType === 'procedure' ? 'procedimento' : 'consulta';
  const text = `Olá ${appointmentData.patientName}, você confirma seu ${tipoAgendamento} para ${appointmentData.date} às ${appointmentData.time}?`;
    
    const messageResult = await this.sendInteractiveMessage(
      client, 
      to, 
      text, 
      [
      { title: 'Confirma presença', id: 'confirm_appointment' },
      { title: 'Cancelar', id: 'cancel_appointment' }
      ],
      appointmentData.appointmentType || 'consultation',
      appointmentData.patientName,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
      appointmentData.specialty || ''
    );

    if (messageResult.success) {
      await this.schedulerService.markNotificationSent(Number(appointment.id));
    }

    return messageResult;
  }

  async handleWebhook(webhookData: WebhookRequestDto) {
    try {
      this.logger.log('Recebendo webhook da Twilio: ' + JSON.stringify(webhookData));
      
      // Log detalhado para capturar a resposta do botão
      this.logger.log(`Dados do webhook: AccountSid=${webhookData.AccountSid}, From=${webhookData.From}, To=${webhookData.To}`);
      
      // Verificar se temos uma resposta de botão
      if (webhookData.ButtonText) {
        this.logger.log(`RESPOSTA DE BOTÃO DETECTADA: ${webhookData.ButtonText}`);
        
        // Processar a resposta do botão imediatamente
        this.logger.log('Buscando agendamento para processar a resposta do botão');
        const appointment = await this.findAppointmentByPhone(webhookData.From);
        
        if (appointment) {
          this.logger.log(`Agendamento encontrado: ${JSON.stringify(appointment)}`);
          
          // Processar a resposta do botão
          await this.processButtonResponse(appointment, webhookData.ButtonText);
          
          return {
            success: true,
            message: `Botão processado: ${webhookData.ButtonText}`,
            appointmentId: appointment.id,
            buttonResponse: webhookData.ButtonText
          };
        } else {
          this.logger.warn(`Nenhum agendamento encontrado para o telefone: ${webhookData.From}`);
          return {
            success: false,
            error: 'No appointment found for this phone number',
            buttonResponse: webhookData.ButtonText
          };
        }
      }
      
      // Verificar se é apenas uma atualização de status
      const isStatusUpdate = (webhookData.MessageStatus === 'sent' || webhookData.MessageStatus === 'delivered' || 
                           webhookData.SmsStatus === 'sent' || webhookData.SmsStatus === 'delivered');
      
      if (isStatusUpdate) {
        this.logger.log(`Atualização de status: ${webhookData.MessageStatus || webhookData.SmsStatus}`);
        return {
          success: true,
          message: 'Status update received',
          status: webhookData.MessageStatus || webhookData.SmsStatus
        };
      }
      
      // Se não for uma atualização de status nem uma resposta de botão, verificar se é uma resposta de texto
      if (!isStatusUpdate && !webhookData.ButtonText && webhookData.Body) {
        this.logger.log(`Resposta de texto recebida: ${webhookData.Body}. Tratando como resposta.`);
        // Continuar o processamento para tratar como resposta
      }

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

      // Verificar se o agendamento já foi confirmado ou cancelado
      if (appointment.status === 'confirmed' || appointment.status === 'cancelled') {
        this.logger.log(`Agendamento ${appointment.id} já foi ${appointment.status === 'confirmed' ? 'confirmado' : 'cancelado'} anteriormente. Ignorando nova resposta.`);
        return {
          success: true,
          message: `Appointment already ${appointment.status}`,
          status: appointment.status
        };
      }

      this.logger.log('6. Processando resposta do botão');
      if (webhookData.ButtonText) {
        await this.processButtonResponse(appointment, webhookData.ButtonText);
      }

      this.logger.log('7. Atualizando agendamento');
      await this.schedulerService.updateAppointment(Number(appointment.id), {
        lastInteraction: new Date(),
        lastStatus: webhookData.MessageStatus || webhookData.SmsStatus,
        lastResponse: webhookData.ButtonText || undefined,
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
    this.logger.log('Validando campos da mensagem: ' + JSON.stringify(webhookData));
    
    // Se tiver ButtonText, é uma resposta de botão e deve ser válida
    if (webhookData.ButtonText) {
      this.logger.log(`Resposta de botão detectada: ${webhookData.ButtonText}`);
      return true;
    }
    
    // Caso contrário, verifica se é uma atualização de status normal
    return !!(
      webhookData.MessageSid &&
      webhookData.From &&
      (webhookData.MessageStatus || webhookData.SmsStatus)
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
        patientPhone: formattedPhone
      });
      this.logger.log(`Agendamentos encontrados: ${JSON.stringify(appointments)}`);

      if (appointments.length === 0) {
        this.logger.warn('Nenhum agendamento encontrado');
        return null;
      }

      // Retorna o agendamento mais recente
      const sortedAppointments = appointments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      this.logger.log(`Retornando agendamento mais recente: ${JSON.stringify(sortedAppointments[0])}`);
      return sortedAppointments[0];
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamento: ${error.message}`);
      throw error;
    }
  }

  private async processButtonResponse(appointment: IAppointment, response: string): Promise<void> {
    this.logger.log(`Iniciando processamento de resposta do botão para agendamento ${appointment.id}`);
    this.logger.log(`Resposta recebida: '${response}'`);
    
    // Normalizar a resposta para facilitar a comparação
    const normalizedResponse = response.trim().toUpperCase();
    this.logger.log(`Resposta normalizada: '${normalizedResponse}'`);
    
    let status: 'confirmed' | 'cancelled' | 'scheduled' = 'scheduled';
    let shouldSendResponse = false;
    let responseMessage = '';
    
    if (normalizedResponse === 'CONFIRMA PRESENÇA' || normalizedResponse === 'SIM') {
      status = 'confirmed';
      shouldSendResponse = true;
      
      // Garante que appointmentDate seja um objeto Date válido
      const appointmentDate = appointment.appointmentDate instanceof Date 
        ? appointment.appointmentDate 
        : new Date(appointment.appointmentDate);
        
      const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
      
      // Verifica se é um procedimento e tem código de exame
      if (appointment.appointmentType === 'procedure' && appointment.examProtocol) {
        this.logger.log(`Processando procedimento com protocolo: ${appointment.examProtocol}`);
        
        // Busca o cliente para acessar os documentos
        const client = await this.clientRepository.findOne({
          where: { id: appointment.clientId }
        });

        if (client?.documents) {
          try {
            const documents = typeof client.documents === 'string' 
              ? JSON.parse(client.documents) 
              : client.documents;

            this.logger.log(`Documentos encontrados: ${JSON.stringify(documents)}`);
            let preparationLink = '';

            // Verifica se é colonoscopia (que tem links diferentes para manhã e tarde)
            if (appointment.examProtocol === '11380') {
              const hour = parseInt(appointment.appointmentTime.split(':')[0]);
              const isMorning = hour >= 8 && hour <= 11.5;
              preparationLink = documents[appointment.examProtocol]?.[isMorning ? 'manha' : 'tarde'];
              this.logger.log(`Link de preparo para colonoscopia (${isMorning ? 'manhã' : 'tarde'}): ${preparationLink}`);
            } else {
              // Para outros exames, busca o link direto
              preparationLink = documents[appointment.examProtocol];
              this.logger.log(`Link de preparo para exame ${appointment.examProtocol}: ${preparationLink}`);
            }

            if (preparationLink) {
              responseMessage = `Agradecemos o seu retorno. O agendamento foi realizado para a data ${formattedDate}, às ${appointment.appointmentTime}. Segue o preparo do exame: ${preparationLink}`;
            } else {
              responseMessage = `Agradecemos o seu retorno. O agendamento foi realizado para a data ${formattedDate}, às ${appointment.appointmentTime}.`;
              this.logger.warn(`Link de preparo não encontrado para o protocolo: ${appointment.examProtocol}`);
            }
          } catch (error) {
            this.logger.error(`Erro ao processar documentos: ${error.message}`);
            responseMessage = `Agradecemos o seu retorno. O agendamento foi realizado para a data ${formattedDate}, às ${appointment.appointmentTime}.`;
          }
        } else {
          responseMessage = `Agradecemos o seu retorno. O agendamento foi realizado para a data ${formattedDate}, às ${appointment.appointmentTime}.`;
          this.logger.warn(`Documentos não encontrados para o cliente: ${appointment.clientId}`);
        }
      } else {
        responseMessage = `Agradecemos o seu retorno. O agendamento foi realizado para a data ${formattedDate}, às ${appointment.appointmentTime}.`;
      }
    } else if (normalizedResponse === 'CANCELAR' || normalizedResponse === 'NÃO') {
      status = 'cancelled';
      shouldSendResponse = true;
      responseMessage = 'Agradecemos o seu retorno. O agendamento foi desmarcado. Caso queira marcar um novo agendamento, entre em contato com a unidade básica de saúde da sua região.';
    }

    this.logger.log(`Status definido como: ${status} para o agendamento ${appointment.id}`);

    if (status !== 'scheduled') {
      this.logger.log(`Atualizando status do agendamento ${appointment.id} para ${status}`);
      
      await this.schedulerService.updateAppointmentStatus(appointment.id, {
        status,
        confirmationDate: new Date(),
        confirmationResponse: response
      });
      
      this.logger.log(`Status do agendamento atualizado com sucesso. Novo status: ${status}`);
      
      // Busca o agendamento atualizado
      const updatedAppointment = await this.schedulerService.getAppointmentById(appointment.id);
      this.logger.log(`Agendamento após atualização: ${JSON.stringify(updatedAppointment)}`);

      // Envia mensagem de retorno se necessário
      if (shouldSendResponse && responseMessage) {
        this.logger.log(`Preparando para enviar mensagem de resposta para ${appointment.patientPhone}`);
        
        // Usar as credenciais do cliente se disponíveis, caso contrário usar as do .env
        const client = await this.clientRepository.findOne({
          where: { id: appointment.clientId }
        });
        
        const twilioAccountSid = client?.twilioAccountSid || this.configService.get<string>('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = client?.twilioAuthToken || this.configService.get<string>('TWILIO_AUTH_TOKEN');
        const twilioFromNumber = client?.twilioFromNumber || this.configService.get<string>('TWILIO_FROM_NUMBER');

          if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
            throw new Error('Configurações do Twilio não encontradas');
          }

          this.logger.log(`Enviando mensagem de retorno para ${appointment.patientPhone}`);
        
        try {
          const twilioClient = this.getTwilioClient({
            twilioAccountSid,
            twilioAuthToken,
            twilioFromNumber
          });
          
          this.logger.log(`Enviando mensagem para ${appointment.patientPhone} com o texto: ${responseMessage}`);
          
          // Garantir que o número tenha o formato correto
          const formattedPhone = appointment.patientPhone.includes('whatsapp:') 
            ? appointment.patientPhone 
            : `whatsapp:${appointment.patientPhone}`;
            
          await twilioClient.messages.create({
            from: `whatsapp:${twilioFromNumber}`,
            to: formattedPhone,
            body: responseMessage
          });
          
          this.logger.log(`Mensagem enviada com sucesso para ${formattedPhone}`);
          
          this.logger.log('Mensagem de retorno enviada com sucesso');
    } catch (error) {
          this.logger.error(`Erro ao enviar mensagem de retorno: ${error.message}`);
          throw error;
        }
      }
    }
  }

  /**
   * Verifica se um número é válido para WhatsApp
   */
  isValidWhatsAppNumber(phone: string): boolean {
    return this.phoneValidator.isCellPhone(phone);
  }
}
