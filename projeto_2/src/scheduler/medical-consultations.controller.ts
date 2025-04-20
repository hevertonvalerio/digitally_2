import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { ClientTokenGuard } from '../common/guards/client-token.guard';
import { GetClient } from '../common/decorators/get-client.decorator';
import { Client } from '../clients/entities/client.entity';
import { SchedulerService } from './scheduler.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { v4 as uuidv4 } from 'uuid';
import { IAppointment } from '../common/interfaces/scheduler.interface';

@ApiTags('medical-consultations')
@ApiSecurity('client-token')
@UseGuards(ClientTokenGuard)
@Controller('medical-consultations')
export class MedicalConsultationsController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post()
  @ApiOperation({ summary: 'Criar consulta médica' })
  @ApiResponse({ status: 201, description: 'Consulta médica criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createMedicalConsultation(
    @GetClient() client: Client,
    @Body() createAppointmentDto: CreateAppointmentDto
  ) {
    const appointment: IAppointment = {
      ...createAppointmentDto,
      id: Date.now(), // Usando timestamp como ID numérico
      clientId: client.id,
      status: 'scheduled' as const,
      notificationSent: false,
      createdAt: new Date(),
      appointmentDate: new Date(createAppointmentDto.appointmentDate)
    };
    return this.schedulerService.createAppointment(appointment);
  }
}
