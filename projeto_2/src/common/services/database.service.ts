import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAppointment, ISchedulerOptions } from '../interfaces/scheduler.interface';
import { Appointment } from '../../scheduler/entities/appointment.entity';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>
  ) {}

  async findAppointments(options: ISchedulerOptions): Promise<IAppointment[]> {
    this.logger.log(`Buscando agendamentos com filtros: ${JSON.stringify(options)}`);
    
    const queryBuilder = this.appointmentRepository.createQueryBuilder('appointment');

    if (options.date) {
      queryBuilder.andWhere('appointment.appointmentDate = :date', { date: options.date });
    }
    
    if (options.time) {
      queryBuilder.andWhere('appointment.appointmentTime = :time', { time: options.time });
    }
    
    if (options.status) {
      queryBuilder.andWhere('appointment.status = :status', { status: options.status });
    }
    
    if (options.notificationSent !== undefined) {
      queryBuilder.andWhere('appointment.notificationSent = :notificationSent', { notificationSent: options.notificationSent });
    }

    return queryBuilder.getMany();
  }

  async updateAppointment(id: number, data: Partial<IAppointment>): Promise<IAppointment | null> {
    this.logger.log(`Atualizando agendamento ${id} com dados: ${JSON.stringify(data)}`);
    
    await this.appointmentRepository.update(id, data);
    return this.appointmentRepository.findOne({ where: { id } });
  }

  async markNotificationSent(id: number): Promise<IAppointment | null> {
    return this.updateAppointment(id, {
      notificationSent: true,
      notificationDate: new Date()
    });
  }

  async createAppointment(appointmentData: IAppointment): Promise<IAppointment> {
    this.logger.log(`Criando agendamento: ${JSON.stringify(appointmentData)}`);
    
    // Converter strings de data para objetos Date
    const appointment = {
      ...appointmentData,
      appointmentDate: new Date(appointmentData.appointmentDate),
      notificationDate: appointmentData.notificationDate ? new Date(appointmentData.notificationDate) : undefined,
      lastInteraction: appointmentData.lastInteraction ? new Date(appointmentData.lastInteraction) : undefined,
      confirmationDate: appointmentData.confirmationDate ? new Date(appointmentData.confirmationDate) : undefined,
    };

    const newAppointment = this.appointmentRepository.create(appointment);
    const savedAppointment = await this.appointmentRepository.save(newAppointment);

    // Converter datas de volta para o formato esperado pela interface
    return {
      ...savedAppointment,
      appointmentDate: savedAppointment.appointmentDate,
      notificationDate: savedAppointment.notificationDate,
      lastInteraction: savedAppointment.lastInteraction,
      confirmationDate: savedAppointment.confirmationDate,
    };
  }

  async deleteAppointment(id: number): Promise<boolean> {
    this.logger.log(`Removendo agendamento ${id}`);
    const result = await this.appointmentRepository.delete(id);
    return result.affected !== null && result.affected !== undefined && result.affected > 0;
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
