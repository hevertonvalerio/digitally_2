import { Injectable, Logger, Optional } from '@nestjs/common';
import * as Bull from 'bull';
import { ConfigService } from '@nestjs/config';
import { IWhatsappQueueJob, IReportQueueJob, IQueueOptions, INotificationQueueJob, INotificationJob } from '../interfaces/queue.interface';
import { ReportProcessor } from './processors/report.processor';
import { WhatsappProcessor } from './processors/whatsapp.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { DatabaseService } from '../../common/services/database.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly reportQueue: Bull.Queue;
  private readonly whatsappQueue: Bull.Queue;
  private readonly notificationQueue: Bull.Queue;
  private readonly reportProcessor: ReportProcessor;
  private readonly whatsappProcessor: WhatsappProcessor;
  private readonly notificationProcessor: NotificationProcessor;

  constructor(
    private readonly configService: ConfigService,
    reportProcessor: ReportProcessor,
    whatsappProcessor: WhatsappProcessor,
    notificationProcessor: NotificationProcessor,
    @Optional() private readonly schedulerService: SchedulerService,
    private readonly databaseService: DatabaseService,
  ) {
    this.reportProcessor = reportProcessor;
    this.whatsappProcessor = whatsappProcessor;
    this.notificationProcessor = notificationProcessor;

    const redisConfig = {
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379'),
    };

    // Configuração das filas com opções de retry
    const defaultQueueConfig: Bull.QueueOptions = {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Remove jobs completados após 24 horas
          count: 1000, // Mantém os últimos 1000 jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Remove jobs falhos após 7 dias
        },
      },
    };

    // Criação das filas usando Queue do Bull
    this.reportQueue = new Bull('reports', defaultQueueConfig);
    this.whatsappQueue = new Bull('whatsapp', defaultQueueConfig);
    this.notificationQueue = new Bull('notifications', defaultQueueConfig);

    this.setupQueues();
  }

  private setupQueues() {
    // Configuração dos processadores de fila
    this.reportQueue.process(async (job: Bull.Job) => {
      return this.reportProcessor.process(job);
    });

    this.whatsappQueue.process(async (job: Bull.Job) => {
      return this.whatsappProcessor.process(job);
    });

    this.notificationQueue.process(async (job: Bull.Job) => {
      return this.notificationProcessor.handleNotification(job);
    });

    // Configuração dos eventos das filas
    const setupQueueEvents = (queue: Bull.Queue, name: string) => {
      queue.on('completed', (job: Bull.Job) => {
        this.logger.log(`Job ${name} completado: ${job.id}`);
      });

      queue.on('failed', (job: Bull.Job, error: Error) => {
        this.logger.error(
          `Job ${name} falhou (tentativa ${job?.attemptsMade} de ${job?.opts.attempts}): ${job?.id}`,
          error,
        );
      });

      queue.on('stalled', (jobId: string) => {
        this.logger.warn(`Job ${name} stalled: ${jobId}`);
      });

      queue.on('progress', (job: Bull.Job, progress: number) => {
        this.logger.log(`Job ${name} progresso: ${progress}%`);
      });
    };

    setupQueueEvents(this.reportQueue, 'relatório');
    setupQueueEvents(this.whatsappQueue, 'whatsapp');
    setupQueueEvents(this.notificationQueue, 'notificação');
  }

  async addReportJob(job: IReportQueueJob) {
    this.logger.log(`Adicionando job de relatório à fila: ${JSON.stringify(job)}`);
    return this.reportQueue.add('report', job);
  }

  async addWhatsappJob(job: IWhatsappQueueJob, options?: IQueueOptions) {
    this.logger.log(`Adicionando job de WhatsApp à fila: ${JSON.stringify(job)}`);
    return this.whatsappQueue.add('whatsapp', job, options);
  }

  async addNotificationJob(job: INotificationJob): Promise<void> {
    this.logger.log(`Adicionando job de notificação à fila: ${JSON.stringify(job)}`);
    await this.notificationQueue.add(job.type, job.data, {
      priority: job.priority || 0,
      attempts: job.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async sendWhatsAppMessage(to: string, message: string) {
    try {
      // Adiciona à fila de WhatsApp
      await this.whatsappQueue.add({
        to,
        message,
        priority: 'high'
      });
      this.logger.log(`Mensagem WhatsApp adicionada à fila para ${to}`);
    } catch (error) {
      this.logger.error(`Erro ao adicionar mensagem WhatsApp à fila: ${error.message}`);
      throw error;
    }
  }

  async markNotificationAsSent(appointmentId: string): Promise<void> {
    this.logger.log(`Marcando notificação como enviada para o agendamento ${appointmentId}`);
    await this.databaseService.markNotificationSent(appointmentId);
  }

  async getJobStatus(queueName: string, jobId: string) {
    let queue: Bull.Queue;
    switch (queueName) {
      case 'reports':
        queue = this.reportQueue;
        break;
      case 'whatsapp':
        queue = this.whatsappQueue;
        break;
      case 'notifications':
        queue = this.notificationQueue;
        break;
      default:
        throw new Error(`Fila desconhecida: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async getQueueMetrics(queueName: string) {
    let queue: Bull.Queue;
    switch (queueName) {
      case 'reports':
        queue = this.reportQueue;
        break;
      case 'whatsapp':
        queue = this.whatsappQueue;
        break;
      case 'notifications':
        queue = this.notificationQueue;
        break;
      default:
        throw new Error(`Fila desconhecida: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async cleanOldJobs(queueName: string, olderThan: number = 24 * 3600 * 1000): Promise<void> {
    let queue: Bull.Queue;
    switch (queueName) {
      case 'reports':
        queue = this.reportQueue;
        break;
      case 'whatsapp':
        queue = this.whatsappQueue;
        break;
      case 'notifications':
        queue = this.notificationQueue;
        break;
      default:
        throw new Error(`Fila desconhecida: ${queueName}`);
    }

    const jobs = await queue.getJobs(['completed', 'failed']);
    const now = Date.now();

    for (const job of jobs) {
      if (job.timestamp + olderThan < now) {
        await job.remove();
      }
    }
  }

  async clearWhatsappQueue(): Promise<void> {
    await this.whatsappQueue.obliterate({ force: true });
  }

  async clearReportQueue(): Promise<void> {
    await this.reportQueue.obliterate({ force: true });
  }
} 