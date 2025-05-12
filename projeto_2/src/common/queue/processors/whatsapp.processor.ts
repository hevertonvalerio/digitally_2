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

  private async sendWhatsappMessage(job: IWhatsappQueueJob): Promise<void> {
    try {
      // Determina o tipo de mensagem baseado no conteúdo
      const isTemplate = job.message.includes('Bom dia!') || job.message.includes('Boa tarde!');
      
      if (isTemplate) {
        // Para mensagens de template (confirmação de agendamento)
        const contentSid = 'HXae76698eafa48856859c29746d5b7729';
        
        // Verifica se é procedimento com preparo
        const hasPreparation = job.procedureOrType && job.examProtocol;
        let preparationLink = null;
        
        if (hasPreparation && job.examProtocol) {
          preparationLink = await this.getDocumentLink(job.clientId, job.examProtocol);
          
          // Ajusta o link do preparo baseado no tipo de procedimento
          switch (job.examProtocol) {
            case '11380': // Colonoscopia
              const appointmentHour = parseInt(job.time.split(':')[0]);
              const isMorning = appointmentHour >= 8 && appointmentHour < 11.5;
              preparationLink = isMorning ? 
                'preparo_manha_colonoscopia.pdf' : 
                'preparo_tarde_colonoscopia.pdf';
              break;
            
            case '13480': // Eletroencefalograma - Adulto
              preparationLink = 'preparo_adulto_eletroencefalograma.pdf';
              break;
            
            case '13481': // Eletroencefalograma
              preparationLink = 'preparo_ped_eletroencefalograma.pdf';
              break;
            
            case '11381': // Endoscopia
              preparationLink = 'preparo_endoscopia.pdf';
              break;
          }
        }

        this.logger.debug(`Enviando mensagem WhatsApp (template):\n  De: ${this.twilioFromNumber}\n  Para: ${job.phoneNumber}\n  ContentSid: ${contentSid}\n  Variáveis: ${JSON.stringify({
          '1': job.patientName,
          '2': job.procedureOrType,
          '3': job.specialty,
          '4': job.date,
          '5': job.time,
          '6': hasPreparation ? 'Sim' : 'Não',
          '7': preparationLink || ''
        })}`);

        const result = await this.twilioClient.messages.create({
          messagingServiceSid: 'MG52975d494649f1b59aea25295e29e2b0',
          to: `whatsapp:${job.phoneNumber}`,
          contentSid: contentSid,
          contentVariables: JSON.stringify({
            '1': job.patientName,
            '2': job.procedureOrType,
            '3': job.specialty,
            '4': job.date,
            '5': job.time,
            '6': hasPreparation ? 'Sim' : 'Não',
            '7': preparationLink || ''
          }),
          statusCallback: `${this.configService.get('BASE_URL')}/api/whatsapp/webhook`
        });

        this.logger.debug(`Mensagem WhatsApp (template) enviada com sucesso: ${result.sid}`);
      } else {
        // Para mensagens livres (cancelamento, etc)
        const result = await this.twilioClient.messages.create({
          messagingServiceSid: 'MG52975d494649f1b59aea25295e29e2b0',
          to: `whatsapp:${job.phoneNumber}`,
          body: job.message,
          statusCallback: `${this.configService.get('BASE_URL')}/api/whatsapp/webhook`
        });

        this.logger.debug(`Mensagem WhatsApp (livre) enviada com sucesso: ${result.sid}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem WhatsApp: ${error.message}`, error.stack);
      throw error;
    }
  }
}