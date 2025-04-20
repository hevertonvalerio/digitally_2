import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { CommonModule } from '../common/common.module';
import { Client } from '../clients/entities/client.entity';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    TypeOrmModule.forFeature([Client])
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}
