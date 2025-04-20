import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { QueueModule } from '../common/queue/queue.module';
import { MedicalConsultationsController } from './medical-consultations.controller';
import { ReportsModule } from '../reports/reports.module';
import { CommonModule } from '../common/common.module';
import { Client } from '../clients/entities/client.entity';

@Module({
  imports: [
    CommonModule,
    forwardRef(() => QueueModule),
    ReportsModule,
    TypeOrmModule.forFeature([Client])
  ],
  providers: [SchedulerService],
  controllers: [SchedulerController, MedicalConsultationsController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
