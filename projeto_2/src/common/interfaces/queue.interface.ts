export interface IQueueOptions {
  attempts?: number;
  delay?: number;
  priority?: number;
}

export interface IQueueJob<T> {
  data: T;
  options?: IQueueOptions;
}

export interface IWhatsappQueueJob {
  appointmentId: string;
  message: string;
  retryCount?: number;
  phoneNumber?: string;
}

export interface IReportQueueJob {
  reportType: 'cancellation' | 'confirmation' | 'no_response';
  date: string;
}

export interface INotificationQueueJob {
  type: string;
  data: {
    appointmentId: string;
    patientName: string;
    patientPhone: string;
    appointmentDate: string;
    appointmentTime: string;
  };
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

export interface INotificationJob {
  type: 'appointment' | 'business_area_report' | 'error_alert' | 'appointment_40h' | 'appointment_response' | 'discarded_message';
  data: IAppointmentNotification | IBusinessAreaReport | IErrorAlert | IDiscardedMessage;
  priority?: number;
  attempts?: number;
}

export interface IAppointmentNotification {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType?: 'Consultation' | 'Procedure';
  specialty?: string;
  examProtocol?: string;
  whatsappStatus?: 'pending' | 'sent' | 'confirmed' | 'cancelled' | 'no_response';
  retryCount?: number;
  response?: string;
  messageId?: string;
  receivedAt?: string;
}

export interface IDiscardedMessage {
  messageId: string;
  from: string;
  content?: string;
  receivedAt: string;
  reason: string;
}

export interface IPAQueueJob {
  type: 'discarded_message';
  data: IDiscardedMessage;
} 