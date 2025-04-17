export interface IAppointment {
  id: number;
  clientId: number;
  patientName: string;
  patientPhone: string;
  cpf: string;
  appointmentDate: Date;
  appointmentTime: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notificationSent: boolean;
  notificationDate?: Date;
  specialty: string;
  appointmentType: 'consultation' | 'procedure';
  examProtocol?: string;
  notes?: string;
  lastInteraction?: Date;
  lastStatus?: string;
  lastResponse?: string;
  confirmationDate?: Date;
  confirmationResponse?: string;
  createdAt: Date;
  client?: any;
  notifications?: any[];
}

export interface ISchedulerOptions {
  date?: string;
  time?: string;
  status?: string;
  notificationSent?: boolean;
  patientPhone?: string;
  id?: number;
}

export interface INotificationJob {
  type: 'appointment' | 'business_area_report' | 'error_alert' | 'appointment_48h';
  data: IAppointmentNotification | IBusinessAreaReport | IErrorAlert;
  priority?: number;
  attempts?: number;
}

export interface IAppointmentNotification {
  appointmentId: number;
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
