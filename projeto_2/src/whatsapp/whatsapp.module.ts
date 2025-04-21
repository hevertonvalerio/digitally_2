import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PhoneValidatorService } from '../common/services/phone-validator.service';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { QueueModule } from '../common/queue/queue.module';
import { ClientTokenModule } from '../common/guards/client-token.module';
import { Client } from '../clients/entities/client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    SchedulerModule,
    QueueModule,
    ClientTokenModule
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, PhoneValidatorService],
  exports: [WhatsappService, PhoneValidatorService]
})
export class WhatsappModule {}
