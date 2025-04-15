export interface IAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  cpf: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notificationSent: boolean;
  notificationDate?: string;
  specialty: string;
  appointmentType: 'consultation' | 'procedure';
  examProtocol?: string;
  notes?: string;
  // Campos adicionais para interações do WhatsApp
  lastInteraction?: string;
  lastStatus?: string;
  lastResponse?: string;
  confirmationDate?: string;
  confirmationResponse?: string;
}

export interface ISchedulerOptions {
  date?: string;
  time?: string;
  status?: string;
  notificationSent?: boolean;
  patientPhone?: string;
}

export interface INotificationJob {
  type: 'appointment' | 'business_area_report' | 'error_alert' | 'appointment_48h';
  data: IAppointmentNotification | IBusinessAreaReport | IErrorAlert;
  priority?: number;
  attempts?: number;
}

export interface IAppointmentNotification {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
}

export interface IBusinessAreaReport {
  date: string;
  pdfBuffer: Buffer;
  appointmentCount: number;
}

export interface IErrorAlert {
  error: string;
  process: string;
  date: string;
} 