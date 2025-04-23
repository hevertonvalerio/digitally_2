import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Appointment } from '../scheduler/entities/appointment.entity';
import { DatabaseService } from '../common/services/database.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get<number>('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false, // Ativar temporariamente para criar as tabelas
        logging: process.env.NODE_ENV === 'development',
        ssl: false
      }),
    }),
    TypeOrmModule.forFeature([Appointment])
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule]
})
export class DatabaseModule {}
