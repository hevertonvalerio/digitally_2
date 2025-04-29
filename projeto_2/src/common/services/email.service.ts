import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailOptions } from '../interfaces/report.interface';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const fromEmail = this.configService.get<string>('FROM_EMAIL');
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    this.logger.log(`Configurando serviço de email com Resend para: ${fromEmail}`);
    
    if (!fromEmail || !resendApiKey) {
      this.logger.error('Credenciais do Resend não configuradas corretamente');
      return;
    }

    const transportConfig: SMTPTransport.Options = {
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: resendApiKey
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    this.logger.debug('Configurações de email:');
    this.logger.debug(`Host: ${transportConfig.host}`);
    this.logger.debug(`Porta: ${transportConfig.port}`);
    this.logger.debug(`From Email: ${fromEmail}`);
    this.logger.debug(`SSL/TLS: ${transportConfig.secure ? 'Ativo' : 'Inativo'}`);

    this.transporter = nodemailer.createTransport(transportConfig);

    // Testar a conexão imediatamente
    this.verifyTransporter();
  }

  private async verifyTransporter(): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.error('Transporter não foi inicializado corretamente');
        return;
      }

      this.logger.debug('Iniciando verificação da conexão SMTP...');
      
      const testResult = await this.transporter.verify();
      this.logger.debug('Resultado do teste de conexão:', testResult);
      
      this.logger.log('Conexão com servidor de email verificada com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao verificar conexão com servidor de email: ${error.message}`);
      this.logger.debug('Stack trace completo:', error.stack);
      
      if (error.response) {
        this.logger.error(`Detalhes adicionais: ${JSON.stringify(error.response)}`);
      }
    }
  }

  async sendEmail(options: IEmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        throw new Error('Serviço de email não está configurado corretamente');
      }

      const fromEmail = this.configService.get<string>('FROM_EMAIL');
      this.logger.log(`Tentando enviar e-mail para: ${options.to.join(', ')}`);

      const mailOptions = {
        from: fromEmail,
        to: options.to.join(', '),
        subject: options.subject,
        html: options.body,
        attachments: options.attachments?.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content
        }))
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`E-mail enviado com sucesso. ID: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail: ${error.message}`);
      if (error.response) {
        this.logger.error(`Detalhes do erro: ${JSON.stringify(error.response)}`);
      }
      return false;
    }
  }

  async sendReportEmail(
    to: string[],
    reportName: string,
    reportBuffer: Buffer,
    format: 'pdf' | 'csv'
  ): Promise<boolean> {
    const date = new Date();
    const formattedDate = date.toLocaleDateString('pt-BR');

    const emailOptions: IEmailOptions = {
      to,
      subject: `${reportName} - ${formattedDate}`,
      body: `
        <h2>${reportName}</h2>
        <p>Olá,</p>
        <p>Segue em anexo o relatório <strong>${reportName}</strong> gerado em ${formattedDate}.</p>
        <br>
        <p>Atenciosamente,<br>Sistema de Agendamentos</p>
      `,
      attachments: [{
        filename: `${reportName.toLowerCase().replace(/\s+/g, '_')}_${date.toISOString().split('T')[0]}.${format}`,
        content: reportBuffer
      }]
    };

    return this.sendEmail(emailOptions);
  }
}