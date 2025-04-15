import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ReportsModule } from './reports/reports.module';
import { QueueModule } from './common/queue/queue.module';
import { CommonModule } from './common/common.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    QueueModule,
    ReportsModule,
    SchedulerModule,
    WhatsappModule,
  ],
  providers: [],
})
export class AppModule {}
