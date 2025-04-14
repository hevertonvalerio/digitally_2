import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailOptions } from '../interfaces/report.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Configuração simplificada usando Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_APP_PASSWORD') // Senha de aplicativo do Gmail
      }
    });
  }

  async sendEmail(options: IEmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get('EMAIL_USER'),
        to: options.to.join(', '),
        subject: options.subject,
        html: options.body,
        attachments: options.attachments?.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content
        }))
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`E-mail enviado com sucesso para: ${options.to.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail: ${error.message}`);
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