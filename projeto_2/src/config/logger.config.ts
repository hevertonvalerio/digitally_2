import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

const logDirectory = path.join(__dirname, '..', '..', 'logs');

// Formato comum para logs em arquivo
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Configuração do transporte para logs de requisições HTTP
const requestsLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDirectory, 'requests-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'http',
  format: fileFormat,
});

// Configuração do transporte para logs da aplicação
const appLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDirectory, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'debug', // Captura todos os níveis de log da aplicação
  format: fileFormat,
});

// Configuração do transporte para o console
const consoleTransport = new winston.transports.Console({
  level: 'debug', // Alterado para debug para capturar mais detalhes
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
  ),
});

// Criação da instância do logger
export const logger = winston.createLogger({
  transports: [
    requestsLogTransport,
    appLogTransport,
    // Adiciona o console transport apenas se não estiver em produção
    ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : []),
  ],
  exitOnError: false,
});

// Stream para uso com Morgan
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
