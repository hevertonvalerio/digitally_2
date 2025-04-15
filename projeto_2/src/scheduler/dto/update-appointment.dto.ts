import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiProperty({ required: false, example: 'João da Silva' })
  @IsOptional()
  @IsString()
  patientName?: string;

  @ApiProperty({ required: false, example: '+5511999999999' })
  @IsOptional()
  @IsString()
  patientPhone?: string;

  @ApiProperty({ required: false, example: '2024-04-15' })
  @IsOptional()
  @IsString()
  appointmentDate?: string;

  @ApiProperty({ required: false, example: '14:30' })
  @IsOptional()
  @IsString()
  appointmentTime?: string;

  @ApiProperty({ required: false, enum: ['scheduled', 'confirmed', 'cancelled', 'completed'] })
  @IsOptional()
  @IsEnum(['scheduled', 'confirmed', 'cancelled', 'completed'])
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

  @ApiProperty({ required: false, example: 'Clínica Geral' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({ required: false, enum: ['consultation', 'procedure'] })
  @IsOptional()
  @IsEnum(['consultation', 'procedure'])
  appointmentType?: 'consultation' | 'procedure';

  @ApiProperty({ required: false, example: 'Preparo do exame.pdf' })
  @IsOptional()
  @IsString()
  examProtocol?: string;

  @ApiProperty({ required: false, example: 'Paciente confirmou por telefone' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notificationSent?: boolean;
} 