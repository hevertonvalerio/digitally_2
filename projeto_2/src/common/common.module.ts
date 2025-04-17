import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './services/database.service';
import { EmailService } from './services/email.service';
import { PhoneValidatorService } from './services/phone-validator.service';
import { QueueService } from './services/queue.service';
import { Appointment } from '../scheduler/entities/appointment.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Appointment])
  ],
  providers: [
    DatabaseService,
    EmailService,
    PhoneValidatorService,
    QueueService
  ],
  exports: [
    DatabaseService,
    EmailService,
    PhoneValidatorService,
    QueueService
  ]
})
export class CommonModule {}
