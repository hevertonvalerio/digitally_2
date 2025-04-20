import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'; // Adicionado MiddlewareConsumer, NestModule
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ReportsModule } from './reports/reports.module';
import { QueueModule } from './common/queue/queue.module';
import { CommonModule } from './common/common.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { DatabaseModule } from './database/database.module';
import { ClientTokenModule } from './common/guards/client-token.module';
import configuration from './config/configuration';
import * as path from 'path';
import { LoggerMiddleware } from './common/middleware/logger.middleware'; // Adicionado LoggerMiddleware

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
    DatabaseModule,
    ScheduleModule.forRoot(),
    CommonModule,
    QueueModule,
    ReportsModule,
    SchedulerModule,
    WhatsappModule,
    ClientTokenModule,
  ],
  providers: [],
})
export class AppModule implements NestModule { // Implementa NestModule
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware) // Aplica o LoggerMiddleware
      .forRoutes('*'); // Para todas as rotas
  }
}
