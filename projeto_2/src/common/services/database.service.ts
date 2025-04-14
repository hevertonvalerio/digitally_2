import { Injectable, Logger } from '@nestjs/common';
import { IAppointment, ISchedulerOptions } from '../interfaces/scheduler.interface';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private appointments: IAppointment[] = [];

  constructor() {
    // Inicializando dados mock
    this.initializeMockData();
  }

  private initializeMockData() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    this.appointments = [
      {
        id: '1',
        patientName: 'João Silva',
        patientPhone: '+5511999999999',
        cpf: '12345678900',
        appointmentDate: today.toISOString().split('T')[0],
        appointmentTime: '09:00',
        specialty: 'Clínica Geral',
        appointmentType: 'consultation',
        status: 'scheduled',
        notificationSent: false,
        notes: 'Primeira consulta'
      },
      {
        id: '2',
        patientName: 'Maria Oliveira',
        patientPhone: '+5511988888888',
        cpf: '98765432100',
        appointmentDate: today.toISOString().split('T')[0],
        appointmentTime: '10:30',
        specialty: 'Retorno',
        appointmentType: 'consultation',
        status: 'confirmed',
        notificationSent: true,
        notificationDate: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Retorno'
      },
      {
        id: '3',
        patientName: 'Pedro Santos',
        patientPhone: '+5511977777777',
        cpf: '45678912300',
        appointmentDate: tomorrow.toISOString().split('T')[0],
        appointmentTime: '14:00',
        specialty: 'Clínica Geral',
        appointmentType: 'consultation',
        status: 'scheduled',
        notificationSent: false,
        notes: 'Consulta de rotina'
      },
      {
        id: '4',
        patientName: 'Carlos Ferreira',
        patientPhone: '+5511966666666',
        cpf: '78912345600',
        appointmentDate: nextWeek.toISOString().split('T')[0],
        appointmentTime: '11:00',
        specialty: 'Retorno',
        appointmentType: 'consultation',
        status: 'cancelled',
        notificationSent: true,
        notificationDate: new Date(nextWeek.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        notes: 'Paciente desmarcou'
      },
      {
        id: '5',
        patientName: 'Ana Costa',
        patientPhone: '+5511955555555',
        cpf: '32165498700',
        appointmentDate: nextWeek.toISOString().split('T')[0],
        appointmentTime: '15:30',
        specialty: 'Primeira Consulta',
        appointmentType: 'consultation',
        status: 'scheduled',
        notificationSent: false,
        notes: 'Nova paciente'
      },
      {
        id: '6',
        patientName: 'Gustavo Da Silva',
        patientPhone: '+5511975657964',
        cpf: '14725836900',
        appointmentDate: nextWeek.toISOString().split('T')[0],
        appointmentTime: '15:30',
        specialty: 'Primeira Consulta',
        appointmentType: 'consultation',
        status: 'scheduled',
        notificationSent: false,
        notes: 'Novo paciente'
      }
    ];
  }

  async findAppointments(options: ISchedulerOptions): Promise<IAppointment[]> {
    this.logger.log(`Buscando agendamentos com filtros: ${JSON.stringify(options)}`);
    
    return this.appointments.filter(appointment => {
      if (options.date && appointment.appointmentDate !== options.date) {
        return false;
      }
      
      if (options.time && appointment.appointmentTime !== options.time) {
        return false;
      }
      
      if (options.status && appointment.status !== options.status) {
        return false;
      }
      
      if (options.notificationSent !== undefined && appointment.notificationSent !== options.notificationSent) {
        return false;
      }
      
      return true;
    });
  }

  async updateAppointment(id: string, data: Partial<IAppointment>): Promise<IAppointment | null> {
    this.logger.log(`Atualizando agendamento ${id} com dados: ${JSON.stringify(data)}`);
    
    const index = this.appointments.findIndex(appointment => appointment.id === id);
    if (index === -1) {
      return null;
    }
    
    this.appointments[index] = {
      ...this.appointments[index],
      ...data
    };
    
    return this.appointments[index];
  }

  async markNotificationSent(id: string): Promise<IAppointment | null> {
    return this.updateAppointment(id, {
      notificationSent: true,
      notificationDate: new Date().toISOString()
    });
  }

  async createAppointment(appointment: IAppointment): Promise<IAppointment> {
    this.logger.log(`Criando agendamento: ${JSON.stringify(appointment)}`);
    this.appointments.push(appointment);
    return appointment;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    this.logger.log(`Removendo agendamento ${id}`);
    const index = this.appointments.findIndex(appointment => appointment.id === id);
    if (index === -1) {
      return false;
    }
    this.appointments.splice(index, 1);
    return true;
  }

  async getAppointments(options: ISchedulerOptions = {}): Promise<IAppointment[]> {
    try {
      this.logger.log(`Buscando agendamentos com filtros: ${JSON.stringify(options)}`);
      return this.findAppointments(options);
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos: ${error.message}`);
      return [];
    }
  }
} 