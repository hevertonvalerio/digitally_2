import { Controller, Post, Body, UseGuards, Req, Logger, HttpCode } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ApiOperation, ApiResponse, ApiTags, ApiSecurity } from '@nestjs/swagger';
import { GetClient } from '../common/decorators/get-client.decorator';
import { PublicRoute } from '../common/decorators/public-route.decorator';
import { ClientTokenGuard } from '../common/guards/client-token.guard';
import { Client } from '../clients/entities/client.entity';
import { WhatsappSuccessResponseDto, WhatsappErrorResponseDto } from './dto/whatsapp-response.dto';
import { WebhookRequestDto } from './dto/webhook-request.dto';
import { SendAppointmentConfirmationDto } from './dto/send-appointment-confirmation.dto';
import { Request } from 'express';

@ApiTags('whatsapp')
@ApiSecurity('client-token')
@UseGuards(ClientTokenGuard)
@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('confirm-appointment')
  @ApiOperation({
    summary: 'Enviar confirmação de agendamento via WhatsApp',
    description: 'Envia uma mensagem interativa com botões Sim/Não para confirmar um agendamento.',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensagem enviada com sucesso',
    type: WhatsappSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Erro ao enviar mensagem',
    type: WhatsappErrorResponseDto,
  })
  async sendAppointmentConfirmation(
    @GetClient() client: Client,
    @Body() data: SendAppointmentConfirmationDto
  ) {
    return await this.whatsappService.sendAppointmentConfirmation(
      client,
      data.to,
      {
        patientName: data.patientName,
        date: data.date,
        time: data.time,
        specialty: data.specialty,
        appointmentType: data.appointmentType
      },
    );
  }

  @Post('webhook')
  @PublicRoute()
  @ApiOperation({
    summary: 'Receber atualizações de status das mensagens',
    description: 'Endpoint que recebe webhooks do Twilio com atualizações de status e respostas dos botões.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processado com sucesso',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Webhook processed for message SM1a2b3c4d5e6f7g8h9i0j' },
        status: { type: 'string', example: 'delivered' },
        buttonResponse: { type: 'string', example: 'Sim' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Erro ao processar webhook',
    schema: {
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Invalid AccountSid' },
      },
    },
  })
  async handleWebhook(@Body() body: any, @Req() request: Request) {
    // Log detalhado dos dados recebidos para capturar a resposta do botão
    this.logger.log(`===== WEBHOOK RECEBIDO =====`);
    this.logger.log(`Dados completos: ${JSON.stringify(body)}`);
    
    // Log de campos específicos para facilitar o diagnóstico
    this.logger.log(`ButtonText: ${body.ButtonText || 'Não encontrado'}`);
    this.logger.log(`Body: ${body.Body || 'Não encontrado'}`);
    this.logger.log(`From: ${body.From || 'Não encontrado'}`);
    this.logger.log(`To: ${body.To || 'Não encontrado'}`);
    
    // Verificar todos os campos do body para encontrar a resposta do botão
    for (const key in body) {
      this.logger.log(`Campo ${key}: ${body[key]}`);
    }
    
    try {
      // Identificar a resposta do botão (pode estar em diferentes campos)
      let buttonText = body.ButtonText;
      
      // Se não encontrou no ButtonText, verificar no Body
      if (!buttonText && body.Body) {
        // Verificar se o Body contém uma resposta de botão conhecida
        if (['Confirma presença', 'Cancelar', 'SIM', 'NÃO'].includes(body.Body)) {
          buttonText = body.Body;
          this.logger.log(`Resposta de botão encontrada no campo Body: ${buttonText}`);
        }
      }
      
      // Converter o body para o formato esperado pelo serviço
      const webhookData = {
        AccountSid: body.AccountSid,
        MessageSid: body.MessageSid || body.SmsSid,
        From: body.From,
        To: body.To,
        Body: body.Body,
        MessageStatus: body.MessageStatus,
        SmsStatus: body.SmsStatus,
        ButtonText: buttonText // Usar a resposta do botão identificada
      };
      
      this.logger.log(`Enviando para processamento: ButtonText = ${buttonText}`);
      
      // Chamar o serviço para processar o webhook
      const result = await this.whatsappService.handleWebhook(webhookData);
      
      this.logger.debug(`Resultado do processamento do webhook: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Erro ao processar webhook: ${error.message}`);
      // Sempre retorna 200 para evitar erro 11200 do Twilio
      return { 
        success: false, 
        error: error.message,
        status: 'error'
      };
    }
  }
}
