import { ApiProperty } from '@nestjs/swagger';

export class WebhookRequestDto {
  @ApiProperty({
    description: 'ID da conta Twilio',
    example: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // << Aqui alterado
  })
  AccountSid: string;

  @ApiProperty({
    description: 'ID da mensagem',
    example: 'SMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  })
  MessageSid: string;

  @ApiProperty({
    description: 'Número do remetente',
    example: 'whatsapp:+5511999999999'
  })
  From: string;

  @ApiProperty({
    description: 'Status da mensagem SMS',
    example: 'received',
    enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'received']
  })
  SmsStatus: string;

  @ApiProperty({
    description: 'Status da mensagem (alternativo)',
    example: 'delivered',
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    required: false
  })
  MessageStatus?: string;

  @ApiProperty({
    description: 'Texto do botão clicado (se houver)',
    example: 'Sim',
    required: false
  })
  ButtonText?: string;
}
