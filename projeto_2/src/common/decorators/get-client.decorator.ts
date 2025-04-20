import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Client } from '../../clients/entities/client.entity';

export const GetClient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Client => {
    const request = ctx.switchToHttp().getRequest();
    return request.client;
  },
);
