import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from '../common/queue/queue.service';
import { DatabaseService } from '../common/services/database.service';
import { PhoneValidatorService } from '../common/services/phone-validator.service';
import { 
  IAppointment, 
  ISchedulerOptions
} from '../common/interfaces/scheduler.interface';
import { 
  INotificationJob,
  IAppointmentNotification,
  IBusinessAreaReport,
  IErrorAlert
} from '../common/interfaces/queue.interface';
import * as PDFDocument from 'pdfkit';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReportsService } from '../reports/reports.service';
import { EmailService } from '../common/services/email.service';
import { ConfigService } from '@nestjs/config';
import { IReportOptions } from '../common/interfaces/report.interface';
import { getPreparationLinkFromDocuments } from '../common/util/preparation-link.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './../clients/entities/client.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  private readonly PROCEDURES_WITH_PREPARATION: Record<string, { needsPreparation: boolean; preparationLink: string }> = {
    '11380': { // Colonoscopia
      needsPreparation: true,
      preparationLink: process.env.COLONOSCOPY_PREPARATION_LINK || ''
    },
    '13480': { // Eletroencefalograma - Adulto
      needsPreparation: true,
      preparationLink: process.env.EEG_PREPARATION_LINK || ''
    }
  };

  constructor(
    private readonly queueService: QueueService,
    private readonly databaseService: DatabaseService,
    private readonly phoneValidator: PhoneValidatorService,
    private readonly reportsService: ReportsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  @Cron('1 0 * * *', {
    timeZone: 'America/Sao_Paulo'
  })
  async handleDailyTasks() {
    this.logger.log('Iniciando tarefas diárias de agendamento - 00:00:01 (Brasília)');
    
    const today = new Date().toISOString().split('T')[0];
    const options: ISchedulerOptions = {
      date: today,
      status: 'scheduled',
      notificationSent: false
    };

    try {
      const appointments = await this.databaseService.findAppointments(options);
      this.logger.log(`Encontrados ${appointments.length} agendamentos para hoje`);

      if (appointments.length > 0) {
        const pdfBuffer = await this.generateAttendanceList(appointments, today);
        
        const businessReport: INotificationJob = {
          type: 'business_area_report',
          data: {
            date: today,
            pdfBuffer: pdfBuffer,
            appointmentCount: appointments.length
          }
        };
        await this.queueService.addNotificationJob(businessReport);
      }

      for (const appointment of appointments) {
        const notification: INotificationJob = {
          type: 'appointment',
          data: {
            appointmentId: Number(appointment.id),
            clientId: appointment.clientId,
            patientName: appointment.patientName,
            patientPhone: appointment.patientPhone,
            appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
            appointmentTime: appointment.appointmentTime,
            retryCount: 0
          },
          attempts: 3,
          priority: 0
        };
        await this.queueService.addNotificationJob(notification);
      }
    } catch (error) {
      this.logger.error('Erro ao processar tarefas diárias:', error);
      const errorAlert: INotificationJob = {
        type: 'error_alert',
        data: {
          error: error.message,
          process: 'daily_tasks',
          date: today
        }
      };
      await this.queueService.addNotificationJob(errorAlert);
    }
  }

  @Cron('1 0 * * *', {
    timeZone: 'America/Sao_Paulo'
  })
  async handle48HoursCollection() {
    this.logger.log('Iniciando coleta de dados para agendamentos em 48 horas - 00:00:01 (Brasília)');
    
    try {
      const appointments = await this.collectAppointmentsFor48Hours();
      
      if (appointments.length > 0) {
        this.logger.log(`Processando ${appointments.length} agendamentos para 48 horas à frente`);
        
        // Adiciona jobs para processamento de cada agendamento
        for (const appointment of appointments) {
          const notification: INotificationJob = {
            type: 'appointment_40h',
            data: {
              appointmentId: Number(appointment.id),
              clientId: appointment.clientId,
              patientName: appointment.patientName,
              patientPhone: appointment.patientPhone,
              appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
              appointmentTime: appointment.appointmentTime,
              retryCount: 0
            },
            attempts: 3,
            priority: 2
          };
          await this.queueService.addNotificationJob(notification);
        }
      } else {
        this.logger.log('Nenhum agendamento encontrado para 48 horas à frente');
      }
    } catch (error) {
      this.logger.error('Erro ao processar coleta de dados para 48 horas:', error);
      const errorAlert: INotificationJob = {
        type: 'error_alert',
        data: {
          error: error.message,
          process: '48h_collection',
          date: new Date().toISOString().split('T')[0]
        }
      };
      await this.queueService.addNotificationJob(errorAlert);
    }
  }

  private async generateAttendanceList(appointments: IAppointment[], date: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Cabeçalho
        doc.fontSize(20).text('Lista de Presença', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Data: ${format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text('Clínica Médica', { align: 'center' });
        doc.fontSize(10).text('cpf: XX.XXX.XXX/0001-XX', { align: 'center' });
        doc.moveDown();

        const tableTop = 200;
        const lineHeight = 25;
        const pageWidth = doc.page.width - 100; // 50px de margem de cada lado
        const colWidths = {
          hora: 80,
          nome: 200,
          tipo: 150,
          assinatura: 100
        };

        // Função auxiliar para desenhar linhas horizontais
        const drawHorizontalLines = (startY: number, endY: number) => {
          let y = startY;
          while (y <= endY) {
            doc.moveTo(50, y)
               .lineTo(550, y)
               .lineWidth(0.5)
               .strokeColor('#CCCCCC')
               .stroke();
            y += lineHeight;
          }
        };

        // Cabeçalho da tabela
        doc.strokeColor('#000000')
           .lineWidth(1)
           .fontSize(10)
           .text('Horário', 50, tableTop)
           .text('Paciente', 130, tableTop)
           .text('Tipo Consulta', 330, tableTop)
           .text('Assinatura', 480, tableTop);

        // Linha mais forte após o cabeçalho
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .lineWidth(1)
           .strokeColor('#000000')
           .stroke();

        let yPosition = tableTop + 30;
        let currentPage = 1;

        appointments
          .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
          .forEach((appointment, index) => {
            if (yPosition > 700) {
              // Desenha linhas horizontais até o fim da página atual
              drawHorizontalLines(yPosition - lineHeight, 700);
              
              doc.addPage();
              currentPage++;
              yPosition = 50;

              // Desenha linhas horizontais na nova página
              drawHorizontalLines(yPosition, 700);
            }

            // Se for primeira linha da página, desenha linhas horizontais do topo até aqui
            if (index === 0 || yPosition === 50) {
              drawHorizontalLines(yPosition, 700);
            }

            doc.strokeColor('#000000')
               .lineWidth(1)
               .fontSize(10)
               .text(appointment.appointmentTime, 50, yPosition)
               .text(appointment.patientName, 130, yPosition)
               .text(appointment.specialty, 330, yPosition);

            // Linha para assinatura (mais escura)
            doc.moveTo(480, yPosition + lineHeight - 5)
               .lineTo(550, yPosition + lineHeight - 5)
               .lineWidth(1)
               .strokeColor('#000000')
               .stroke();

            yPosition += lineHeight;
          });

        // Rodapé
        doc.fontSize(8)
           .strokeColor('#000000')
           .text('Documento gerado automaticamente pelo sistema', 50, doc.page.height - 50, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyTasks() {
    this.logger.log('Iniciando tarefas semanais de agendamento');
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().split('T')[0];
    
    const options: ISchedulerOptions = {
      date: nextWeekDate,
      status: 'scheduled',
      notificationSent: false
    };

    try {
      const appointments = await this.databaseService.findAppointments(options);
      this.logger.log(`Encontrados ${appointments.length} agendamentos para próxima semana`);

      for (const appointment of appointments) {
        await this.queueService.addNotificationJob({
          type: 'appointment',
          data: {
            appointmentId: Number(appointment.id),
            clientId: appointment.clientId,
            patientName: appointment.patientName,
            patientPhone: appointment.patientPhone,
            appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
            appointmentTime: appointment.appointmentTime,
            retryCount: 0
          },
          attempts: 3,
          priority: 0
        });
      }
    } catch (error) {
      this.logger.error('Erro ao processar tarefas semanais:', error);
    }
  }

  async getAppointments(options: ISchedulerOptions): Promise<IAppointment[]> {
    this.logger.log(`Buscando agendamentos com filtros: ${JSON.stringify(options)}`);
    return this.databaseService.findAppointments(options);
  }

  async updateAppointment(id: number, data: Partial<IAppointment>): Promise<IAppointment | null> {
    this.logger.log(`Atualizando agendamento ${id} com dados: ${JSON.stringify(data)}`);
    return this.databaseService.updateAppointment(id, data);
  }

  async markNotificationSent(appointmentId: number): Promise<IAppointment | null> {
    this.logger.log(`Marcando notificação como enviada para o agendamento ${appointmentId}`);
    return this.databaseService.markNotificationSent(appointmentId);
  }

  async getAppointmentById(appointmentId: number): Promise<IAppointment | null> {
    this.logger.log(`Buscando agendamento por ID: ${appointmentId}`);
    const appointments = await this.databaseService.findAppointments({ id: appointmentId });
    return appointments[0] || null;
  }

  async updateAppointmentStatus(appointmentId: number, data: {
    status: 'confirmed' | 'cancelled',
    confirmationDate: Date,
    confirmationResponse: string
  }): Promise<IAppointment | null> {
    this.logger.log(`Atualizando status do agendamento ${appointmentId} para ${data.status}`);
    return this.updateAppointment(appointmentId, data);
  }

  async createAppointment(appointmentData: Partial<IAppointment>): Promise<IAppointment> {
    let preparationLink: string | undefined;
    if (
      appointmentData.appointmentType === 'procedure' &&
      appointmentData.examProtocol &&
      appointmentData.clientId
    ) {
      const client = await this.clientRepository.findOne({ where: { id: appointmentData.clientId } });
      if (client && client.documents) {
        preparationLink = getPreparationLinkFromDocuments(
          client.documents,
          appointmentData.examProtocol,
          appointmentData.appointmentTime
        );
      }
    }

    if (preparationLink) {
      appointmentData.needsPreparation = true;
      appointmentData.preparationLink = preparationLink;
    }

    this.logger.log(`Criando agendamento para ${appointmentData.patientName}`);
    
    // Valida o número de telefone
    if (!appointmentData.patientPhone || !this.phoneValidator.isCellPhone(appointmentData.patientPhone)) {
      this.logger.warn(`Número de telefone inválido para ${appointmentData.patientName}: ${appointmentData.patientPhone}`);
      
      // Notifica área de negócio sobre telefone inválido
      await this.queueService.addNotificationJob({
        type: 'error_alert',
        data: {
          error: `Número de telefone inválido: ${appointmentData.patientPhone}`,
          process: 'appointment_creation',
          date: new Date().toISOString().split('T')[0]
        }
      });
      
      throw new BadRequestException('Número de telefone inválido');
    }

    // Formata o número para o padrão WhatsApp
    try {
      appointmentData.patientPhone = this.phoneValidator.formatToWhatsApp(appointmentData.patientPhone);
    } catch (error) {
      throw new BadRequestException('Erro ao formatar número de telefone: ' + error.message);
    }

    // Garante que todos os campos obrigatórios estejam presentes
    const completeAppointment: IAppointment = {
      id: appointmentData.id || Date.now(),
      patientName: appointmentData.patientName || '',
      patientPhone: appointmentData.patientPhone,
      appointmentDate: appointmentData.appointmentDate || new Date(),
      appointmentTime: appointmentData.appointmentTime || '',
      status: appointmentData.status || 'scheduled',
      notificationSent: appointmentData.notificationSent || false,
      specialty: appointmentData.specialty || '',
      appointmentType: appointmentData.appointmentType || 'consultation',
      cpf: appointmentData.cpf || '',
      clientId: appointmentData.clientId || 0,
      createdAt: appointmentData.createdAt || new Date(),
      examProtocol: appointmentData.examProtocol,
      needsPreparation: appointmentData.needsPreparation || false,
      preparationLink: appointmentData.preparationLink
    };

    return this.databaseService.createAppointment(completeAppointment);
  }

  async deleteAppointment(id: number): Promise<boolean> {
    this.logger.log(`Removendo agendamento ${id}`);
    return this.databaseService.deleteAppointment(id);
  }

  /**
   * Coleta dados de agendamentos que ocorrerão em 48 horas
   * @returns Lista de agendamentos para processamento
   */
  async collectAppointmentsFor48Hours(): Promise<IAppointment[]> {
    this.logger.log('Coletando agendamentos para 48 horas à frente');
    
    // Calcula o intervalo de datas (48 horas à frente)
    const startDate = addDays(new Date(), 2);
    const endDate = addDays(new Date(), 3);
    
    const options: ISchedulerOptions = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'scheduled',
      notificationSent: false
    };

    try {
      const appointments = await this.databaseService.findAppointments(options);
      this.logger.log(`Encontrados ${appointments.length} agendamentos entre ${options.startDate} e ${options.endDate}`);
      
      return appointments;
    } catch (error) {
      this.logger.error('Erro ao coletar agendamentos para 48 horas:', error);
      throw error;
    }
  }

  /**
   * Coleta dados de agendamentos que ocorrerão em 40 horas
   * @returns Lista de agendamentos para processamento
   */
  async collectAppointmentsFor40Hours(): Promise<IAppointment[]> {
    this.logger.log('Coletando agendamentos que acontecerão em 40 horas');
    
    // Calcula o intervalo de datas (agendamentos que acontecerão em 40 horas)
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + 40); // Data alvo (40 horas à frente)
    
    // Janela de 1 hora para buscar agendamentos
    const startDate = new Date(targetDate);
    startDate.setHours(startDate.getHours() - 2);
    const endDate = new Date(targetDate);
    endDate.setHours(endDate.getHours() + 2);
    
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    this.logger.log(`Buscando agendamentos próximos a ${targetDateStr} ${targetDate.getHours()}:${targetDate.getMinutes()}`);
    this.logger.log(`Janela de busca: de ${startDateStr} ${startDate.getHours()}:${startDate.getMinutes()} até ${endDateStr} ${endDate.getHours()}:${endDate.getMinutes()}`);
    
    const options: ISchedulerOptions = {
      startDate: startDateStr,
      endDate: endDateStr,
      status: 'scheduled',
      notificationSent: false
    };

    try {
      const appointments = await this.databaseService.findAppointments(options);
      
      // Filtra os agendamentos considerando a hora
      const filteredAppointments = appointments.filter(appointment => {
        const appointmentDateTime = new Date(
          `${appointment.appointmentDate}T${appointment.appointmentTime}`
        );
        return appointmentDateTime >= startDate && appointmentDateTime <= endDate;
      });

      this.logger.log(`Encontrados ${filteredAppointments.length} agendamentos próximos a ${targetDateStr}`);
      
      // Adiciona cada agendamento à fila de notificações
      for (const appointment of filteredAppointments) {
        let appointmentDateStr: string;
        const appointmentDate = appointment.appointmentDate as Date | string;
        
        if (appointmentDate instanceof Date) {
          appointmentDateStr = appointmentDate.toISOString().split('T')[0];
        } else {
          appointmentDateStr = String(appointmentDate).split('T')[0];
        }

        const notification: INotificationJob = {
          type: 'appointment_40h',
          data: {
            appointmentId: Number(appointment.id),
            clientId: appointment.clientId,
            patientName: appointment.patientName,
            patientPhone: appointment.patientPhone,
            appointmentDate: appointmentDateStr,
            appointmentTime: appointment.appointmentTime,
            appointmentType: appointment.appointmentType === 'consultation' ? 'Consultation' : 'Procedure',
            specialty: appointment.specialty,
            retryCount: 0
          },
          attempts: 3,
          priority: 1
        };
        await this.queueService.addNotificationJob(notification);
      }
      
      return filteredAppointments;
    } catch (error) {
      this.logger.error('Erro ao coletar agendamentos para 40 horas:', error);
      throw error;
    }
  }

  async scheduleWhatsappNotification(
    appointmentId: number,
    message: string,
    retryCount: number
  ): Promise<void> {
    await this.queueService.addWhatsappJob({
      appointmentId,
      message,
      retryCount
    }, {
      delay: 3600000 // 1 hora
    });
  }

  async scheduleAppointmentNotification(appointment: any): Promise<void> {
    // Agenda notificação para 40 horas antes do agendamento
    const notification: INotificationJob = {
      type: 'appointment_40h',
      data: {
        appointmentId: Number(appointment.id),
        clientId: appointment.clientId,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        appointmentDate: appointment.date.toISOString().split('T')[0],
        appointmentTime: appointment.time,
        appointmentType: appointment.type,
        specialty: appointment.specialty,
        examProtocol: appointment.examProtocol,
        whatsappStatus: 'pending'
      }
    };

    await this.queueService.addNotificationJob(notification);
  }

  @Cron('0 0 * * *') // Executa todos os dias à meia-noite
  async handleDailyReports() {
    try {
      this.logger.log('Iniciando geração de relatórios diários');
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const reportDate = yesterday.toISOString().split('T')[0];
      const businessEmail = this.configService.get('BUSINESS_EMAIL') || 'business@example.com';
      
      // Gera relatório de cancelamentos
      const cancellationReport = await this.reportsService.generateCancellationReport(reportDate);
      
      // Envia por e-mail
      await this.emailService.sendReportEmail(
        [businessEmail],
        'Relatório de Pacientes que Desmarcaram',
        cancellationReport,
        'pdf'
      );
      
      // Gera relatório de confirmações
      const confirmationReport = await this.reportsService.generateConfirmationReport(reportDate);
      
      // Envia por e-mail
      await this.emailService.sendReportEmail(
        [businessEmail],
        'Relatório de Pacientes que Confirmaram',
        confirmationReport,
        'pdf'
      );
      
      // Gera relatório de sem resposta
      const noResponseReport = await this.reportsService.generateNoResponseReport(reportDate);
      
      // Envia por e-mail
      await this.emailService.sendReportEmail(
        [businessEmail],
        'Relatório de Pacientes sem WhatsApp/Sem Resposta',
        noResponseReport,
        'pdf'
      );
      
      this.logger.log('Relatórios diários gerados e enviados com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao gerar relatórios diários: ${error.message}`);
    }
  }
}
