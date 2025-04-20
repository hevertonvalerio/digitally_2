import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

const logDirectory = path.join(__dirname, '..', '..', 'logs'); // Caminho para a pasta logs na raiz de projeto_2

// Configuração do transporte para rotação diária de arquivos
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDirectory, 'requests-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true, // Compacta logs antigos
  maxSize: '20m', // Tamanho máximo do arquivo de log
  maxFiles: '14d', // Mantém logs por 14 dias
  level: 'http', // Nível de log específico para requisições HTTP
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(), // Formato JSON para fácil parse
  ),
});

// Configuração do transporte para o console (útil para desenvolvimento)
const consoleTransport = new winston.transports.Console({
  level: 'info', // Nível de log para o console
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
    dailyRotateFileTransport,
    // Adiciona o console transport apenas se não estiver em produção
    ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : []),
  ],
  exitOnError: false, // Não encerra a aplicação em caso de erro no logger
});

// Stream para uso com Morgan (opcional, mas útil para logs HTTP detalhados)
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim()); // Usa o nível http para logs de requisição
  },
};
