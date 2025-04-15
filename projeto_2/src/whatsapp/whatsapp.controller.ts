import { Controller, Post, Body } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WhatsappSuccessResponseDto, WhatsappErrorResponseDto } from './dto/whatsapp-response.dto';
import { WebhookRequestDto } from './dto/webhook-request.dto';
import { SendAppointmentConfirmationDto } from './dto/send-appointment-confirmation.dto';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
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
  async sendAppointmentConfirmation(@Body() data: SendAppointmentConfirmationDto) {
    return await this.whatsappService.sendAppointmentConfirmation(
      data.to,
      {
        patientName: data.patientName,
        date: data.date,
        time: data.time,
      },
    );
  }

  @Post('webhook')
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
  async handleWebhook(@Body() webhookData: WebhookRequestDto) {
    return await this.whatsappService.handleWebhook(webhookData);
  }
}
