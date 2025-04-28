import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsPhoneNumber, IsOptional } from 'class-validator';

export class SendAppointmentConfirmationDto {
  @ApiProperty({
    description: 'Número do WhatsApp do paciente',
    example: '+5511999999999',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Nome do paciente',
    example: 'João Silva',
  })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({
    description: 'Data da consulta',
    example: '12/01/2024',
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Horário da consulta',
    example: '15:00',
  })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({
    description: 'Tipo do agendamento',
    example: 'procedure',
    enum: ['procedure', 'consultation'],
    default: 'consultation'
  })
  @IsString()
  @IsOptional()
  appointmentType?: 'procedure' | 'consultation';
} 