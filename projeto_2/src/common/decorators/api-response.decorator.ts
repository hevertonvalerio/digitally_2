import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiResponseDecorator = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Operação realizada com sucesso',
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: getSchemaPath(model) },
              message: { type: 'string', example: 'Operação realizada com sucesso' },
              timestamp: { type: 'string', example: '2023-04-07T12:00:00.000Z' },
            },
          },
        ],
      },
    }),
  );
}; 