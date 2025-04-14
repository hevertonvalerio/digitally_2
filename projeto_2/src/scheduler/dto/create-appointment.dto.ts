import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, Matches, IsEnum, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Nome completo do paciente',
    example: 'João da Silva'
  })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({
    description: 'Número de telefone do paciente (formato: +5511999999999)',
    example: '+5511999999999'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+55\d{10,11}$/, {
    message: 'O telefone deve estar no formato +55DDD999999999'
  })
  patientPhone: string;

  @ApiProperty({
    description: 'CPF do paciente (somente números)',
    example: '12345678900'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, {
    message: 'O CPF deve conter 11 dígitos numéricos'
  })
  cpf: string;

  @ApiProperty({
    description: 'Data da consulta (formato: YYYY-MM-DD)',
    example: '2024-04-15'
  })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({
    description: 'Hora da consulta (formato: HH:mm)',
    example: '14:30'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'A hora deve estar no formato HH:mm'
  })
  appointmentTime: string;

  @ApiProperty({
    description: 'Especialidade médica',
    example: 'Clínica Geral',
    enum: ['Clínica Geral', 'Cardiologia', 'Oftalmologia', 'Ortopedia', 'Pediatria']
  })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty({
    description: 'Tipo de agendamento',
    example: 'consultation',
    enum: ['consultation', 'procedure']
  })
  @IsEnum(['consultation', 'procedure'])
  @IsNotEmpty()
  appointmentType: 'consultation' | 'procedure';

  @ApiProperty({
    description: 'Protocolo do exame (opcional)',
    example: 'Preparo do exame.pdf',
    required: false
  })
  @IsString()
  @IsOptional()
  examProtocol?: string;

  @ApiProperty({
    description: 'Observações adicionais (opcional)',
    example: 'Paciente com histórico de alergias',
    required: false
  })
  @IsString()
  @IsOptional()
  notes?: string;
} 