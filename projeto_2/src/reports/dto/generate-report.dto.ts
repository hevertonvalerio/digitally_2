import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsEnum, IsDateString } from 'class-validator';
import { ReportFormat } from '../../common/interfaces/report.interface';

export class GenerateReportDto {
  @ApiProperty({
    description: 'Data inicial do período do relatório',
    example: '2024-03-27',
    type: String
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Data final do período do relatório',
    example: '2024-03-27',
    type: String
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Formato do relatório',
    enum: ['pdf', 'csv'],
    example: 'pdf',
    default: 'pdf'
  })
  @IsEnum(['pdf', 'csv'])
  format: ReportFormat;

  @ApiProperty({
    description: 'Lista de e-mails para envio do relatório',
    example: ['email@exemplo.com'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  emailTo: string[];
} 