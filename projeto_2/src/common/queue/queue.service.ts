import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { SchedulerService } from '../../scheduler/scheduler.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
    @Inject(forwardRef(() => SchedulerService))
    private readonly schedulerService: SchedulerService,
  ) {}

  async addWhatsappJob(data: any, options?: any) {
    this.logger.log(`Adicionando job WhatsApp: ${JSON.stringify(data)}`);
    return this.whatsappQueue.add(data, options);
  }

  async addNotificationJob(data: any) {
    this.logger.log(`Adicionando job de notificação: ${JSON.stringify(data)}`);
    return this.notificationQueue.add(data);
  }

  async updateAppointmentStatus(appointmentId: string, data: {
    status: 'confirmed' | 'cancelled',
    confirmationDate: string,
    confirmationResponse: string
  }) {
    return this.schedulerService.updateAppointmentStatus(appointmentId, data);
  }

  async getAppointmentById(appointmentId: string) {
    return this.schedulerService.getAppointmentById(appointmentId);
  }

  async markNotificationAsSent(appointmentId: string) {
    return this.schedulerService.markNotificationSent(appointmentId);
  }
} 