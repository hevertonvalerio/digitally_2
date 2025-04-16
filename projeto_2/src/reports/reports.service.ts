import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import { format as dateFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DatabaseService } from '../common/services/database.service';
import { EmailService } from '../common/services/email.service';
import { 
  IReportOptions, 
  IReportGenerationResult, 
  IReportBase,
  INoResponseReport,
  IEmailOptions 
} from '../common/interfaces/report.interface';
import { IAppointment } from '../common/interfaces/scheduler.interface';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService
  ) {}

  async generateCancellationReport(date: string): Promise<Buffer> {
    try {
      const appointments = await this.databaseService.getAppointments({ 
        date,
        status: 'cancelled'
      });

      if (appointments.length === 0) {
        return this.generateEmptyReport('Relatório de Pacientes que Desmarcaram', date);
      }

      const reportData: IReportBase[] = appointments.map((apt: IAppointment) => ({
        name: apt.patientName,
        cpf: apt.cpf,
        phone: apt.patientPhone,
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        specialty: apt.specialty,
        type: apt.appointmentType
      }));

      return this.generateReport(
        'Relatório de Pacientes que Desmarcaram',
        reportData,
        'pdf'
      );
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório de cancelamentos: ${error.message}`);
      throw error;
    }
  }

  async generateConfirmationReport(date: string): Promise<Buffer> {
    try {
      const appointments = await this.databaseService.getAppointments({ 
        date,
        status: 'confirmed'
      });

      if (appointments.length === 0) {
        return this.generateEmptyReport('Relatório de Pacientes que Confirmaram', date);
      }

      const reportData: IReportBase[] = appointments.map((apt: IAppointment) => ({
        name: apt.patientName,
        cpf: apt.cpf,
        phone: apt.patientPhone,
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        specialty: apt.specialty,
        type: apt.appointmentType
      }));

      return this.generateReport(
        'Relatório de Pacientes que Confirmaram',
        reportData,
        'pdf'
      );
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório de confirmações: ${error.message}`);
      throw error;
    }
  }

  async generateNoResponseReport(date: string): Promise<Buffer> {
    try {
      const appointments = await this.databaseService.getAppointments({ 
        date,
        status: 'scheduled',
        notificationSent: true
      });

      const reportData: INoResponseReport[] = appointments.map((apt: IAppointment) => ({
        name: apt.patientName,
        cpf: apt.cpf,
        phone: apt.patientPhone,
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        specialty: apt.specialty,
        type: apt.appointmentType,
        reason: !apt.patientPhone ? 'Sem registro telefônico' : 'Sem WhatsApp'
      }));

      return this.generateReport(
        'Relatório de Pacientes sem WhatsApp/Sem Resposta',
        reportData,
        'pdf'
      );
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório de pacientes sem resposta: ${error.message}`);
      throw error;
    }
  }

  private async generateEmptyReport(title: string, date: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });

      doc.on('data', chunks.push.bind(chunks));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      // Adiciona título
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      // Adiciona data do relatório
      doc.fontSize(12).text(
        `Gerado em: ${dateFormat(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        { align: 'right' }
      );
      doc.moveDown();

      // Adiciona cabeçalho da tabela
      const headers = ['Nome', 'CPF', 'Data', 'Horário', 'Especialidade', 'Tipo'];
      const rowHeight = 30;
      const colWidth = (doc.page.width - 100) / headers.length;
      let yPos = doc.y;

      // Desenha cabeçalho
      headers.forEach((header, i) => {
        doc.fontSize(12).text(header, 50 + (i * colWidth), yPos, {
          width: colWidth,
          align: 'center'
        });
      });

      // Adiciona linha após o cabeçalho
      yPos += rowHeight;
      doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke();
      
      // Adiciona espaço antes da mensagem
      yPos += 30;
      
      // Adiciona linha horizontal antes da mensagem
      doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke();
      
      // Mensagem de nenhum registro centralizada na página
      doc.fontSize(12).text(
        `Nenhum registro encontrado para a data ${dateFormat(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}`,
        50,  // x position
        yPos + 10,  // y position
        {
          width: doc.page.width - 100,
          align: 'center'
        }
      );
      
      // Adiciona linha horizontal após a mensagem
      yPos += 40;
      doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke();

      doc.end();
    });
  }

  private async generateReport(
    title: string,
    data: IReportBase[] | INoResponseReport[],
    format: 'pdf' | 'csv'
  ): Promise<Buffer> {
    if (data.length === 0) {
      return this.generateEmptyReport(title, new Date().toISOString().split('T')[0]);
    }

    const fileName = this.generateFileName(title, format);
    let fileBuffer: Buffer;

    if (format === 'pdf') {
      fileBuffer = await this.generatePDF(title, data);
    } else {
      fileBuffer = await this.generateCSV(data);
    }

    return fileBuffer;
  }

  private async generatePDF(title: string, data: IReportBase[] | INoResponseReport[]): Promise<Buffer> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });

      // Coleta os chunks do PDF
      doc.on('data', chunks.push.bind(chunks));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      // Adiciona título
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();

      // Adiciona data do relatório
      doc.fontSize(12).text(
        `Gerado em: ${dateFormat(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        { align: 'right' }
      );
      doc.moveDown();

      // Cabeçalho da tabela
      const headers = ['Nome', 'CPF', 'Data', 'Horário', 'Especialidade', 'Tipo'];
      if ('reason' in data[0]) {
        headers.push('Motivo');
      }

      // Desenha a tabela
      this.drawTable(doc, headers, data);

      doc.end();
    });
  }

  private drawTable(doc: PDFKit.PDFDocument, headers: string[], data: any[]): void {
    const rowHeight = 30;
    const colWidth = (doc.page.width - 100) / headers.length;
    let yPos = doc.y;

    // Desenha cabeçalho
    headers.forEach((header, i) => {
      doc.fontSize(12).text(header, 50 + (i * colWidth), yPos, {
        width: colWidth,
        align: 'center'
      });
    });

    yPos += rowHeight;
    doc.moveTo(50, yPos).lineTo(doc.page.width - 50, yPos).stroke();
    yPos += 10;

    // Desenha linhas de dados
    data.forEach((row) => {
      if (yPos > doc.page.height - 100) {
        doc.addPage();
        yPos = 50;
      }

      headers.forEach((header, i) => {
        let value = '';
        switch(header.toLowerCase()) {
          case 'nome':
            value = row.name || '';
            break;
          case 'cpf':
            value = row.cpf || '';
            break;
          case 'data':
            value = row.date ? dateFormat(new Date(row.date), 'dd/MM/yyyy', { locale: ptBR }) : '';
            break;
          case 'horário':
            value = row.time || '';
            break;
          case 'especialidade':
            value = row.specialty || '';
            break;
          case 'tipo':
            value = row.type || '';
            break;
          case 'motivo':
            value = row.reason || '';
            break;
          default:
            value = '';
        }

        doc.fontSize(10).text(
          value,
          50 + (i * colWidth),
          yPos,
          {
            width: colWidth,
            align: 'center'
          }
        );
      });

      yPos += rowHeight;
      
      // Adiciona linha divisória entre as linhas de dados
      doc.moveTo(50, yPos - 5).lineTo(doc.page.width - 50, yPos - 5).stroke();
    });
  }

  private async generateCSV(data: IReportBase[] | INoResponseReport[]): Promise<Buffer> {
    const headers = ['Nome', 'CPF', 'Data', 'Horário', 'Especialidade', 'Tipo'];
    if ('reason' in data[0]) {
      headers.push('Motivo');
    }

    const csvRows = [
      headers.join(','),
      ...data.map(row => {
        const values = [
          row.name,
          row.cpf,
          row.date,
          row.time,
          row.specialty,
          row.type
        ];
        if ('reason' in row) {
          values.push(row.reason);
        }
        return values.join(',');
      })
    ];

    return Buffer.from(csvRows.join('\n'));
  }

  private generateFileName(title: string, format: 'pdf' | 'csv'): string {
    return `${title.toLowerCase().replace(/\s+/g, '_')}_${dateFormat(new Date(), 'yyyy-MM-dd')}.${format}`;
  }

  async sendReportByEmail(options: IEmailOptions): Promise<boolean> {
    try {
      this.logger.log(`Enviando relatório por e-mail para: ${options.to.join(', ')}`);
      return await this.emailService.sendEmail(options);
    } catch (error) {
      this.logger.error(`Erro ao enviar relatório por e-mail: ${error.message}`);
      return false;
    }
  }
} 