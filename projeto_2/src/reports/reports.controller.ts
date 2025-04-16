import { Controller, Post, Body, Get, Param, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { IReportOptions } from '../common/interfaces/report.interface';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Post('attendance')
  @ApiOperation({ summary: 'Gera lista de presença' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  @ApiBody({ type: GenerateReportDto })
  async generateAttendanceList(@Body() options: GenerateReportDto) {
    this.logger.log('Solicitação de geração de lista de presença recebida');
    
    try {
      const reportBuffer = await this.reportsService.generateConfirmationReport(options.startDate);
      
      // Se houver e-mails configurados, envia o relatório
      if (options.emailTo && options.emailTo.length > 0) {
        await this.reportsService.sendReportByEmail({
          to: options.emailTo,
          subject: 'Lista de Presença',
          body: `Relatório de Lista de Presença - ${options.startDate}`,
          attachments: [{
            filename: `lista_presenca_${options.startDate}.${options.format}`,
            content: reportBuffer
          }]
        });
      }
      
      return {
        success: true,
        fileName: `lista_presenca_${options.startDate}.${options.format}`,
        fileBuffer: reportBuffer
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar lista de presença: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('absentees')
  @ApiOperation({ summary: 'Gera lista de ausentes' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  @ApiBody({ type: GenerateReportDto })
  async generateAbsentList(@Body() options: GenerateReportDto) {
    this.logger.log('Solicitação de geração de lista de ausentes recebida');
    
    try {
      const reportBuffer = await this.reportsService.generateCancellationReport(options.startDate);
      
      // Se houver e-mails configurados, envia o relatório
      if (options.emailTo && options.emailTo.length > 0) {
        await this.reportsService.sendReportByEmail({
          to: options.emailTo,
          subject: 'Lista de Ausentes',
          body: `Relatório de Lista de Ausentes - ${options.startDate}`,
          attachments: [{
            filename: `lista_ausentes_${options.startDate}.${options.format}`,
            content: reportBuffer
          }]
        });
      }
      
      return {
        success: true,
        fileName: `lista_ausentes_${options.startDate}.${options.format}`,
        fileBuffer: reportBuffer
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar lista de ausentes: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Verifica status do relatório' })
  @ApiResponse({ status: 200, description: 'Status do relatório' })
  async getReportStatus(@Param('jobId') jobId: string) {
    this.logger.log(`Verificando status do relatório ${jobId}`);
    
    // Como não temos mais um sistema de jobs, retornamos um status fixo
    return {
      jobId,
      status: 'completed',
      progress: 100,
      result: {
        success: true,
        message: 'Relatório gerado com sucesso'
      }
    };
  }

  @Get('download/:jobId')
  @ApiOperation({ summary: 'Download do relatório' })
  @ApiResponse({ status: 200, description: 'Relatório para download' })
  async downloadReport(@Param('jobId') jobId: string, @Res() res: Response) {
    this.logger.log(`Solicitação de download do relatório ${jobId}`);
    
    try {
      // Como não temos mais um sistema de jobs, geramos o relatório na hora
      const today = new Date().toISOString().split('T')[0];
      const reportBuffer = await this.reportsService.generateConfirmationReport(today);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_${today}.pdf`);
      res.send(reportBuffer);
    } catch (error) {
      this.logger.error(`Erro ao baixar relatório: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
} 