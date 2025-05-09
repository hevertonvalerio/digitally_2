import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Twilio } from 'twilio';
import { IWhatsappQueueJob } from '../../interfaces/queue.interface';
import { QueueService } from '../queue.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../../clients/entities/client.entity';

@Processor('whatsapp')
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);
  private readonly twilioClient: Twilio;
  private readonly twilioFromNumber: string;
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.error('Missing Twilio credentials');
      throw new Error('Missing Twilio credentials');
    }

    this.twilioAccountSid = accountSid;
    this.twilioAuthToken = authToken;
    this.twilioFromNumber = fromNumber;
    this.twilioClient = new Twilio(accountSid, authToken);
  }

  private async getDocumentLink(clientId: number, examProtocolCode: string): Promise<string | null> {
    try {
      const client = await this.clientRepository.findOne({ where: { id: clientId } });
      if (!client || !client.documents) {
        this.logger.warn(`No documents found for client ${clientId}`);
        return null;
      }

      const document = client.documents.find((doc: { cod: string; link: string }) => doc.cod === examProtocolCode);
      if (!document) {
        this.logger.warn(`Document with code ${examProtocolCode} not found for client ${clientId}`);
        return null;
      }

      return document.link;
    } catch (error) {
      this.logger.error(`Error fetching document link: ${error.message}`);
      return null;
    }
  }

  @Process()
  async process(job: Job<IWhatsappQueueJob>) {
    try {
      await this.sendWhatsappMessage(job.data);
    } catch (error) {
      this.logger.error(`Error processing WhatsApp job: ${error.message}`);
      throw error;
    }
  }

  async sendWhatsappMessage(job: IWhatsappQueueJob) {
    if (!this.twilioClient || !this.twilioFromNumber) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const contentSid = this.configService.get<string>('TWILIO_CONTENT_SID');
      if (!contentSid) {
        throw new Error('TWILIO_CONTENT_SID not configured');
      }

      // Se for mensagem de cancelamento, envia diretamente
      if (job.message.includes('agendamento foi desmarcado')) {
        const result = await this.twilioClient.messages.create({
          from: `whatsapp:${this.twilioFromNumber}`,
          to: `whatsapp:${job.phoneNumber}`,
          body: job.message,
          statusCallback: `${this.configService.get('BASE_URL')}/api/whatsapp/webhook`
        });

        this.logger.log(`WhatsApp message sent successfully. SID: ${result.sid}`);

        if (job.appointmentId) {
          await this.queueService.markNotificationAsSent(job.appointmentId);
        }

        return result;
      }

      // Se for mensagem de confirmação com protocolo de exame
      if (job.message.includes('Agradecemos o seu retorno') && job.examProtocol) {
        // Busca o link do documento baseado no código do protocolo
        const documentLink = await this.getDocumentLink(job.clientId, job.examProtocol);
        
        if (!documentLink) {
          this.logger.error(`Document link not found for protocol ${job.examProtocol}`);
          // Envia mensagem sem o anexo
          const result = await this.twilioClient.messages.create({
            from: `whatsapp:${this.twilioFromNumber}`,
            to: `whatsapp:${job.phoneNumber}`,
            body: job.message,
            statusCallback: `${this.configService.get('BASE_URL')}/api/whatsapp/webhook`
          });

          this.logger.log(`WhatsApp message sent without document (not found). SID: ${result.sid}`);
          return result;
        }

        const result = await this.twilioClient.messages.create({
          from: `whatsapp:${this.twilioFromNumber}`,
          to: `whatsapp:${job.phoneNumber}`,
          body: job.message,
          mediaUrl: [documentLink],
          statusCallback: `${this.configService.get('BASE_URL')}/api/whatsapp/webhook`
        });

        this.logger.log(`WhatsApp message with exam protocol sent successfully. SID: ${result.sid}`);

        if (job.appointmentId) {
          await this.queueService.markNotificationAsSent(job.appointmentId);
        }

        return result;
      }

      // Para outras mensagens, continua com o processamento normal
      const dateTimeMatch = job.message.match(/dia ([\d-]+), às ([\d:]+)/);
      if (!dateTimeMatch) {
        throw new Error('Data e hora não encontradas na mensagem');
      }

      const [_, date, time] = dateTimeMatch;

      // Extrair o nome do paciente da mensagem
      const nameMatch = job.message.match(/Olá (.*?)!/);
      if (!nameMatch) {
        throw new Error('Nome do paciente não encontrado na mensagem');
      }

      const patientName = nameMatch[1].trim();

      this.logger.debug(`Enviando mensagem WhatsApp:
        De: ${this.twilioFromNumber}
        Para: ${job.phoneNumber}
        ContentSid: ${contentSid}
        Nome: ${patientName}
        Data: ${date}
        Hora: ${time}
      `);

      const result = await this.twilioClient.messages.create({
        messagingServiceSid: 'MG52975d494649f1b59aea25295e29e2b0',
        to: `whatsapp:${job.phoneNumber}`,
        contentSid: 'HXae76698eafa48856859c29746d5b7729',
        contentVariables: JSON.stringify({
          "1": job.patientName,
          "2": job.procedureOrType,
          "3": job.specialty,
          "4": job.date,
          "5": job.time
        }),
        statusCallback: `${this.configService.get('BASE_URL')}/api/whatsapp/webhook`
      });

      this.logger.log(`WhatsApp message sent successfully. SID: ${result.sid}`);

      if (job.appointmentId) {
        await this.queueService.markNotificationAsSent(job.appointmentId);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      throw error;
    }
  }
} 