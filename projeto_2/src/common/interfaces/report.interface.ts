export type ReportFormat = 'pdf' | 'csv';

export interface IReportBase {
  name: string;
  cpf: string;
  phone: string;
  date: string;
  time: string;
  specialty: string;
  type: 'consultation' | 'procedure';
}

export interface INoResponseReport extends IReportBase {
  reason: 'Sem WhatsApp' | 'Sem registro telefônico' | 'Sem resposta';
}

export interface IReportOptions {
  startDate: string;
  endDate: string;
  format: ReportFormat;
  emailTo: string[];
}

export interface IReportGenerationResult {
  success: boolean;
  fileName: string;
  fileBuffer: Buffer;
  error?: string;
}

export interface IEmailAttachment {
  filename: string;
  content: Buffer;
}

export interface IEmailOptions {
  to: string[];
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    content: Buffer;
  }[];
} 