import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../../clients/entities/client.entity';
import { ClientTokenGuard } from './client-token.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client])
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClientTokenGuard,
    },
    ClientTokenGuard
  ],
  exports: [ClientTokenGuard],
})
export class ClientTokenModule {}
