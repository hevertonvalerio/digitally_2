import { ApiProperty } from '@nestjs/swagger';

export class SendTemplateMessageDto {
  @ApiProperty({
    description: 'Número do WhatsApp do destinatário',
    example: '+5511999999999',
  })
  to: string;

  @ApiProperty({
    description: 'Template da mensagem com variáveis no formato {{variavel}}',
    example: 'Olá {{name}}, sua consulta está marcada para {{date}} às {{time}}.',
  })
  template: string;

  @ApiProperty({
    description: 'Variáveis para substituir no template',
    example: {
      name: 'João Silva',
      date: '12/01/2024',
      time: '15:00',
    },
  })
  variables: Record<string, any>;
} 