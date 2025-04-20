import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';

@Injectable()
export class ClientTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      'isPublic',
      [
        context.getHandler(),
        context.getClass(),
      ]
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-client-token'];

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const client = await this.clientRepository.findOne({
      where: { internalToken: token }
    });

    if (!client) {
      throw new UnauthorizedException('Token inválido');
    }

    // Adiciona o cliente à requisição para uso nos controllers
    request.client = client;
    return true;
  }
}
