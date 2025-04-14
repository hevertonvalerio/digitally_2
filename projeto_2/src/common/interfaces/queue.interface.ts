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
  type: 'appointment' | 'business_area_report' | 'error_alert' | 'appointment_40h';
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
  appointmentType?: 'Consultation' | 'Procedure';
  specialty?: string;
  examProtocol?: string;
  whatsappStatus?: 'pending' | 'sent' | 'confirmed' | 'cancelled' | 'no_response';
  retryCount?: number;
}

export interface IPAQueueJob {
  type: 'discarded_message';
  data: {
    messageId: string;
    from: string;
    content?: string;
    receivedAt: string;
    reason: string;
  };
} 