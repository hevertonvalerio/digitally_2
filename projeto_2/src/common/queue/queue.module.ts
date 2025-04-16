import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ReportProcessor } from './processors/report.processor';
import { ReportsModule } from '../../reports/reports.module';
import { WhatsappProcessor } from './processors/whatsapp.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { SchedulerModule } from '../../scheduler/scheduler.module';
import { BullModule } from '@nestjs/bull';
import { CommonModule } from '../common.module';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
        defaultJobOptions: {
          attempts: 1,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'whatsapp' },
      { name: 'reports' }
    ),
    forwardRef(() => SchedulerModule),
  ],
  providers: [
    QueueService,
    ReportProcessor,
    WhatsappProcessor,
    NotificationProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {} 