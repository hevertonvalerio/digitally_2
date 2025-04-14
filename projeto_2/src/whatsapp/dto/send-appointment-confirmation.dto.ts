import { ApiProperty } from '@nestjs/swagger';

export class SendAppointmentConfirmationDto {
  @ApiProperty({
    description: 'Número do WhatsApp do paciente',
    example: '+5511999999999',
  })
  to: string;

  @ApiProperty({
    description: 'Nome do paciente',
    example: 'João Silva',
  })
  patientName: string;

  @ApiProperty({
    description: 'Data da consulta',
    example: '12/01/2024',
  })
  date: string;

  @ApiProperty({
    description: 'Horário da consulta',
    example: '15:00',
  })
  time: string;
} 