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
        date: apt.appointmentDate.toISOString().split('T')[0],
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
        date: apt.appointmentDate.toISOString().split('T')[0],
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
      // Busca agendamentos sem resposta ou sem WhatsApp
      const appointments = await this.databaseService.getAppointments({ 
        date,
        notificationSent: true,
        status: 'scheduled' // ainda não confirmados/cancelados
      });

      if (appointments.length === 0) {
        return this.generateEmptyReport('Relatório de Pacientes sem Resposta/WhatsApp', date);
      }

      const reportData: INoResponseReport[] = appointments.map((apt: IAppointment) => ({
        name: apt.patientName,
        cpf: apt.cpf,
        phone: apt.patientPhone,
        date: apt.appointmentDate.toISOString().split('T')[0],
        time: apt.appointmentTime,
        specialty: apt.specialty,
        type: apt.appointmentType,
        reason: this.determineNoResponseReason(apt)
      }));

      return this.generateReport(
        'Relatório de Pacientes sem Resposta/WhatsApp',
        reportData,
        'pdf'
      );
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório de sem resposta: ${error.message}`);
      throw error;
    }
  }

  private determineNoResponseReason(appointment: IAppointment): 'Sem WhatsApp' | 'Sem registro telefônico' | 'Sem resposta' {
    if (!appointment.patientPhone) {
      return 'Sem registro telefônico';
    }
    
    // Verifica se houve tentativa de envio mas sem sucesso (indica que não tem WhatsApp)
    if (appointment.notificationSent && !appointment.notificationDate) {
      return 'Sem WhatsApp';
    }
    
    return 'Sem resposta';
  }

  private async generateEmptyReport(title: string, date: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });

      doc.on('data', chunks.push.bind(chunks));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      // Adiciona título em vermelho
      doc.fontSize(24)
         .fillColor('red')
         .text(title, { align: 'center' });
      doc.moveDown();

      // Adiciona data do relatório
      doc.fillColor('black')
         .fontSize(12)
         .text(
           `Gerado em: ${dateFormat(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
           { align: 'right' }
         );
      doc.moveDown();

      // Configuração da tabela
      const tableWidth = doc.page.width - 100;
      const headers = ['Nome', 'CPF', 'Telefone', 'Data agendamento', 'Especialidade'];
      const rowHeight = 30;
      const colWidths = [
        tableWidth * 0.25, // Nome
        tableWidth * 0.15, // CPF
        tableWidth * 0.2,  // Telefone
        tableWidth * 0.2,  // Data agendamento
        tableWidth * 0.2   // Especialidade
      ];

      let xPos = 50;
      let yPos = doc.y;

      // Desenha borda externa da tabela
      doc.rect(xPos, yPos, tableWidth, rowHeight).stroke();

      // Desenha cabeçalho com bordas
      headers.forEach((header, i) => {
        doc.rect(xPos, yPos, colWidths[i], rowHeight).stroke();
        doc.fontSize(12).text(
          header,
          xPos,
          yPos + 10,
          {
            width: colWidths[i],
            align: 'center'
          }
        );
        xPos += colWidths[i];
      });

      yPos += rowHeight;

      // Desenha linha vazia com bordas para a mensagem
      xPos = 50;
      doc.rect(xPos, yPos, tableWidth, rowHeight).stroke();
      
      // Mensagem de nenhum registro centralizada
      doc.fontSize(12).text(
        `Nenhum registro encontrado para a data ${dateFormat(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}`,
        xPos,
        yPos + 10,
        {
          width: tableWidth,
          align: 'center'
        }
      );

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

      // Adiciona título em vermelho
      doc.fontSize(24)
         .fillColor('red')
         .text(title, { align: 'center' });
      doc.moveDown();

      // Adiciona data do relatório
      doc.fillColor('black')
         .fontSize(12)
         .text(
           `Gerado em: ${dateFormat(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
           { align: 'right' }
         );
      doc.moveDown();

      // Cabeçalho da tabela
      const headers = ['Nome', 'CPF', 'Telefone', 'Data agendamento', 'Especialidade'];
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
    const tableWidth = doc.page.width - 100;
    const colWidths = [
      tableWidth * 0.25, // Nome
      tableWidth * 0.15, // CPF
      tableWidth * 0.2,  // Telefone
      tableWidth * 0.2,  // Data agendamento
      tableWidth * 0.2   // Especialidade
    ];
    
    if (headers.includes('Motivo')) {
      colWidths.push(tableWidth * 0.15); // Motivo
    }
    
    let xPos = 50;
    let yPos = doc.y;

    // Desenha borda externa da tabela
    doc.rect(xPos, yPos, tableWidth, rowHeight).stroke();

    // Desenha cabeçalho
    headers.forEach((header, i) => {
      // Desenha borda da célula
      doc.rect(xPos, yPos, colWidths[i], rowHeight).stroke();
      
      doc.fontSize(12).text(
        header,
        xPos,
        yPos + 10,
        {
          width: colWidths[i],
          align: 'center'
        }
      );
      xPos += colWidths[i];
    });

    yPos += rowHeight;

    // Desenha linhas de dados
    data.forEach((row) => {
      if (yPos > doc.page.height - 100) {
        doc.addPage();
        yPos = 50;
      }

      xPos = 50;
      headers.forEach((header, i) => {
        // Desenha borda da célula
        doc.rect(xPos, yPos, colWidths[i], rowHeight).stroke();
        
        let value = '';
        switch(header.toLowerCase()) {
          case 'nome':
            value = row.name || '';
            break;
          case 'cpf':
            value = row.cpf || '';
            break;
          case 'telefone':
            value = row.phone || '';
            break;
          case 'data agendamento':
            const date = row.date ? dateFormat(new Date(row.date), 'dd/MM/yyyy', { locale: ptBR }) : '';
            const time = row.time || '';
            value = `${date} ${time}`;
            break;
          case 'especialidade':
            value = row.specialty || '';
            break;
          case 'motivo':
            value = row.reason || '';
            break;
          default:
            value = '';
        }

        doc.fontSize(10).text(
          value,
          xPos,
          yPos + 10,
          {
            width: colWidths[i],
            align: 'center'
          }
        );
        xPos += colWidths[i];
      });

      yPos += rowHeight;
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

  async scheduleReportsGeneration(date: string): Promise<void> {
    // Agenda geração dos relatórios para 24h após a data especificada
    const reportTime = new Date(date);
    reportTime.setHours(reportTime.getHours() + 24);

    // Agenda os três relatórios
    setTimeout(async () => {
      try {
        this.logger.log('Iniciando geração automática dos relatórios diários');
        
        // Gera os três relatórios
        const [cancellationReport, confirmationReport, noResponseReport] = await Promise.all([
          this.generateCancellationReport(date),
          this.generateConfirmationReport(date),
          this.generateNoResponseReport(date)
        ]);

        // Envia os relatórios por email
        const businessEmail = this.configService.get<string>('BUSINESS_EMAIL');
        if (businessEmail) {
          await Promise.all([
            this.emailService.sendReportEmail(
              [businessEmail],
              'Relatório de Cancelamentos',
              cancellationReport,
              'pdf'
            ),
            this.emailService.sendReportEmail(
              [businessEmail],
              'Relatório de Confirmações',
              confirmationReport,
              'pdf'
            ),
            this.emailService.sendReportEmail(
              [businessEmail],
              'Relatório de Pacientes sem Resposta/WhatsApp',
              noResponseReport,
              'pdf'
            )
          ]);
        }

        this.logger.log('Geração automática dos relatórios concluída com sucesso');
      } catch (error) {
        this.logger.error(`Erro na geração automática dos relatórios: ${error.message}`);
      }
    }, reportTime.getTime() - Date.now());
  }
}
