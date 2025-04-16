import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailOptions } from '../interfaces/report.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD;

    this.logger.log(`Configurando serviço de email para: ${emailUser}`);

    if (!emailUser || !emailPass) {
      this.logger.error('Credenciais de email não configuradas corretamente');
      return;
    }

    // Configuração detalhada do Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass
      },
      debug: true, // Ativa logs detalhados
      logger: true, // Ativa logs do nodemailer
      tls: {
        rejectUnauthorized: false // Apenas para desenvolvimento
      }
    });

    // Verifica a configuração do transporter
    this.verifyTransporter();
  }

  private async verifyTransporter(): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.error('Transporter não foi inicializado corretamente');
        return;
      }

      await this.transporter.verify();
      this.logger.log('Conexão com servidor de email verificada com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao verificar conexão com servidor de email: ${error.message}`);
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

      const emailUser = process.env.EMAIL_USER;
      this.logger.log(`Tentando enviar e-mail para: ${options.to.join(', ')}`);
      this.logger.log(`Usando remetente: ${emailUser}`);

      const mailOptions = {
        from: emailUser,
        to: options.to.join(', '),
        subject: options.subject,
        html: options.body,
        attachments: options.attachments?.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content
        }))
      };

      this.logger.log('Configurações do email:', JSON.stringify(mailOptions, null, 2));

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