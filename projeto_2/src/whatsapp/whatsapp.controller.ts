import { Controller, Post, Body, UseGuards, Req, Logger } from '@nestjs/common';
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
  async handleWebhook(@Body() body: any) {
    const { MessageStatus, Body } = body;

    if (MessageStatus) {
      // Callback de status (enviado/entregue/...)
      this.logger.debug(`Status da mensagem: ${MessageStatus}`);
    } else {
      // Mensagem recebida do paciente
      this.logger.debug(`Mensagem recebida: ${Body}`);
    }

    // Sempre retorna 200 para evitar erro 11200
    return { status: 'ok' };
  }
}
