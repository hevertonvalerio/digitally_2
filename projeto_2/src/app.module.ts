import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ReportsModule } from './reports/reports.module';
import { QueueModule } from './common/queue/queue.module';
import { CommonModule } from './common/common.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import configuration from './config/configuration';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), '.env'),
      load: [configuration],
      cache: false,
      expandVariables: true,
      ignoreEnvFile: false,
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
