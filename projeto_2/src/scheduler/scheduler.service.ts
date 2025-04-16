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

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly databaseService: DatabaseService,
    private readonly phoneValidator: PhoneValidatorService,
    private readonly reportsService: ReportsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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
            appointmentId: appointment.id,
            patientName: appointment.patientName,
            patientPhone: appointment.patientPhone,
            appointmentDate: appointment.appointmentDate,
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
              appointmentId: appointment.id,
              patientName: appointment.patientName,
              patientPhone: appointment.patientPhone,
              appointmentDate: appointment.appointmentDate,
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

        doc.fontSize(20).text('Lista de Presença', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Data: ${format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text('Clínica Médica', { align: 'center' });
        doc.fontSize(10).text('CNPJ: XX.XXX.XXX/0001-XX', { align: 'center' });
        doc.moveDown();

        const tableTop = 200;
        const lineHeight = 25;
        const colWidths = {
          hora: 80,
          nome: 200,
          tipo: 150,
          assinatura: 100
        };

        doc.fontSize(10)
           .text('Horário', 50, tableTop)
           .text('Paciente', 130, tableTop)
           .text('Tipo Consulta', 330, tableTop)
           .text('Assinatura', 480, tableTop);

        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        let yPosition = tableTop + 30;
        appointments
          .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
          .forEach((appointment, index) => {
            if (yPosition > 700) {
              doc.addPage();
              yPosition = 50;
            }

            doc.fontSize(10)
               .text(appointment.appointmentTime, 50, yPosition)
               .text(appointment.patientName, 130, yPosition)
               .text(appointment.specialty, 330, yPosition);

            doc.moveTo(480, yPosition + lineHeight - 5)
               .lineTo(550, yPosition + lineHeight - 5)
               .stroke();

            yPosition += lineHeight;
          });

        doc.fontSize(8)
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
            appointmentId: appointment.id,
            patientName: appointment.patientName,
            patientPhone: appointment.patientPhone,
            appointmentDate: appointment.appointmentDate,
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

  async updateAppointment(id: string, data: Partial<IAppointment>): Promise<IAppointment | null> {
    this.logger.log(`Atualizando agendamento ${id} com dados: ${JSON.stringify(data)}`);
    return this.databaseService.updateAppointment(id, data);
  }

  async markNotificationSent(appointmentId: string): Promise<IAppointment | null> {
    this.logger.log(`Marcando notificação como enviada para o agendamento ${appointmentId}`);
    return this.databaseService.markNotificationSent(appointmentId);
  }

  async getAppointmentById(appointmentId: string): Promise<IAppointment | null> {
    this.logger.log(`Buscando agendamento por ID: ${appointmentId}`);
    const appointments = await this.databaseService.findAppointments({ id: appointmentId });
    return appointments[0] || null;
  }

  async updateAppointmentStatus(appointmentId: string, data: {
    status: 'confirmed' | 'cancelled',
    confirmationDate: string,
    confirmationResponse: string
  }): Promise<IAppointment | null> {
    this.logger.log(`Atualizando status do agendamento ${appointmentId} para ${data.status}`);
    return this.updateAppointment(appointmentId, data);
  }

  async createAppointment(appointment: IAppointment): Promise<IAppointment> {
    this.logger.log(`Criando agendamento para ${appointment.patientName}`);
    
    // Valida o número de telefone
    if (!this.phoneValidator.isCellPhone(appointment.patientPhone)) {
      this.logger.warn(`Número de telefone inválido para ${appointment.patientName}: ${appointment.patientPhone}`);
      
      // Notifica área de negócio sobre telefone inválido
      await this.queueService.addNotificationJob({
        type: 'error_alert',
        data: {
          error: `Número de telefone inválido: ${appointment.patientPhone}`,
          process: 'appointment_creation',
          date: new Date().toISOString().split('T')[0]
        }
      });

      throw new BadRequestException('Número de telefone inválido. Deve ser um celular no formato DDD9XXXXXXXX');
    }

    // Formata o número para o padrão WhatsApp
    try {
      appointment.patientPhone = this.phoneValidator.formatToWhatsApp(appointment.patientPhone);
    } catch (error) {
      throw new BadRequestException('Erro ao formatar número de telefone: ' + error.message);
    }

    return this.databaseService.createAppointment(appointment);
  }

  async deleteAppointment(id: string): Promise<boolean> {
    this.logger.log(`Removendo agendamento ${id}`);
    return this.databaseService.deleteAppointment(id);
  }

  /**
   * Coleta dados de agendamentos que ocorrerão em 48 horas
   * @returns Lista de agendamentos para processamento
   */
  async collectAppointmentsFor48Hours(): Promise<IAppointment[]> {
    this.logger.log('Coletando agendamentos para 48 horas à frente');
    
    // Calcula a data de 48 horas à frente
    const targetDate = addDays(new Date(), 2);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    const options: ISchedulerOptions = {
      date: targetDateStr,
      status: 'scheduled',
      notificationSent: false
    };

    try {
      const appointments = await this.databaseService.findAppointments(options);
      this.logger.log(`Encontrados ${appointments.length} agendamentos para ${targetDateStr} (48 horas à frente)`);
      
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
    this.logger.log('Coletando agendamentos para 40 horas à frente');
    
    // Calcula a data de 40 horas à frente (aproximadamente 1.67 dias)
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + 40);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    const options: ISchedulerOptions = {
      date: targetDateStr,
      status: 'scheduled',
      notificationSent: false
    };

    try {
      const appointments = await this.databaseService.findAppointments(options);
      this.logger.log(`Encontrados ${appointments.length} agendamentos para ${targetDateStr} (40 horas à frente)`);
      
      // Adiciona cada agendamento à fila de notificações
      for (const appointment of appointments) {
        const notification: INotificationJob = {
          type: 'appointment_40h',
          data: {
            appointmentId: appointment.id,
            patientName: appointment.patientName,
            patientPhone: appointment.patientPhone,
            appointmentDate: appointment.appointmentDate,
            appointmentTime: appointment.appointmentTime,
            retryCount: 0
          },
          attempts: 3,
          priority: 1
        };
        await this.queueService.addNotificationJob(notification);
      }
      
      return appointments;
    } catch (error) {
      this.logger.error('Erro ao coletar agendamentos para 40 horas:', error);
      throw error;
    }
  }

  async scheduleWhatsappNotification(
    appointmentId: string,
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
        appointmentId: appointment.id,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        appointmentDate: appointment.date,
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