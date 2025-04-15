import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { IAppointment, ISchedulerOptions } from '../common/interfaces/scheduler.interface';
import { v4 as uuidv4 } from 'uuid';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('scheduler')
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('appointments')
  @ApiOperation({ summary: 'Listar agendamentos' })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos retornada com sucesso' })
  async getAppointments(@Query() options: ISchedulerOptions) {
    return this.schedulerService.getAppointments(options);
  }

  @Get('appointments/48hours')
  @ApiOperation({ summary: 'Coletar agendamentos para 48 horas à frente' })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos para 48 horas à frente retornada com sucesso' })
  async getAppointments48Hours() {
    return this.schedulerService.collectAppointmentsFor48Hours();
  }

  @Get('appointments/40hours')
  @ApiOperation({ summary: 'Coletar agendamentos para 40 horas à frente' })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos para 40 horas à frente retornada com sucesso' })
  async getAppointments40Hours() {
    return this.schedulerService.collectAppointmentsFor40Hours();
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Criar agendamento' })
  @ApiResponse({ status: 201, description: 'Agendamento criado com sucesso' })
  async createAppointment(@Body() appointmentData: Omit<IAppointment, 'id' | 'notificationSent' | 'notificationDate'>) {
    const appointment: IAppointment = {
      ...appointmentData,
      id: uuidv4(),
      notificationSent: false,
    };
    return this.schedulerService.createAppointment(appointment);
  }

  @Put('appointments/:id')
  @ApiOperation({ summary: 'Atualizar agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado' })
  @ApiBody({
    type: UpdateAppointmentDto,
    description: 'Dados para atualização do agendamento',
    examples: {
      default: {
        value: {
          status: "confirmed",
          notes: "Paciente confirmou por telefone",
          specialty: "Clínica Geral",
          appointmentType: "consultation"
        }
      }
    }
  })
  async updateAppointment(
    @Param('id') id: string,
    @Body() data: Partial<IAppointment>,
  ) {
    return this.schedulerService.updateAppointment(id, data);
  }

  @Delete('appointments/:id')
  @ApiOperation({ summary: 'Remover agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento removido com sucesso' })
  async deleteAppointment(@Param('id') id: string) {
    return this.schedulerService.deleteAppointment(id);
  }
} 