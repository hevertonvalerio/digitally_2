import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './services/database.service';
import { EmailService } from './services/email.service';
import { PhoneValidatorService } from './services/phone-validator.service';
import { QueueService } from './services/queue.service';

@Module({
  imports: [ConfigModule],
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