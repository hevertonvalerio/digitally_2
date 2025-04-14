import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PhoneValidatorService } from '../common/services/phone-validator.service';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { QueueModule } from '../common/queue/queue.module';

@Module({
  imports: [SchedulerModule, QueueModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, PhoneValidatorService],
  exports: [WhatsappService, PhoneValidatorService]
})
export class WhatsappModule {}
