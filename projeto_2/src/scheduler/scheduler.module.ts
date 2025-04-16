import { Module, forwardRef } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { QueueModule } from '../common/queue/queue.module';
import { MedicalConsultationsController } from './medical-consultations.controller';
import { ReportsModule } from '../reports/reports.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    CommonModule,
    forwardRef(() => QueueModule),
    ReportsModule
  ],
  providers: [SchedulerService],
  controllers: [SchedulerController, MedicalConsultationsController],
  exports: [SchedulerService],
})
export class SchedulerModule {} 