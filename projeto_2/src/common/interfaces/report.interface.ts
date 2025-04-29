export interface IReportBase {
  name: string;
  cpf: string;
  phone: string;
  date: string;
  time: string;
  specialty: string;
  type?: 'confirmation' | 'cancellation' | 'no-response';
}

export type ReportFormat = 'pdf' | 'csv';

export interface INoResponseReport extends IReportBase {
  reason: string;
}

export interface IReportOptions {
  format: 'pdf' | 'csv';
  date: string;
  type: 'confirmation' | 'cancellation' | 'no-response';
}

export interface IReportGenerationResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

export interface IEmailOptions {
  to: string[];
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
} 