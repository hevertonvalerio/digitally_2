import { ApiProperty } from '@nestjs/swagger';

export class WhatsappSuccessResponseDto {
  @ApiProperty({
    description: 'Indica se a mensagem foi enviada com sucesso',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'ID único da mensagem enviada',
    example: 'MM930d62c5b3eab4181715d16660f4dee1',
  })
  messageId: string;
}

export class WhatsappErrorResponseDto {
  @ApiProperty({
    description: 'Indica que houve um erro no envio',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensagem de erro detalhada',
    example: 'Failed to send message: Invalid phone number',
  })
  error: string;
}
