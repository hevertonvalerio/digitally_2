import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger.config'; // Importa a instância do logger

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    const start = Date.now();

    // Captura o corpo da requisição ANTES de passar para o próximo middleware
    // Nota: Isso pode consumir o stream do corpo. Se outro middleware precisar do corpo cru,
    // pode ser necessário usar uma abordagem diferente (ex: interceptor ou biblioteca como morgan).
    // Para simplificar, vamos logar o que está disponível em req.body.
    const requestBody = { ...req.body }; // Clona o corpo para evitar modificações inesperadas

    // Limpar dados sensíveis do corpo (exemplo: senha)
    if (requestBody.password) {
      requestBody.password = '***REDACTED***';
    }
    // Adicione outras chaves sensíveis conforme necessário

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;

      const logDetails = {
        method,
        url: originalUrl,
        statusCode,
        durationMs: duration,
        ip,
        userAgent,
        requestHeaders: req.headers, // Adiciona cabeçalhos
        requestBody: Object.keys(requestBody).length > 0 ? requestBody : undefined, // Adiciona corpo se não estiver vazio
        // responseHeaders: res.getHeaders(), // Opcional: Adicionar cabeçalhos de resposta
        // responseBody: undefined, // Opcional e complexo: Logar corpo da resposta exigiria interceptar a resposta
      };

      if (statusCode >= 500) {
        logger.error('HTTP Request Completed', logDetails);
      } else if (statusCode >= 400) {
        logger.warn('HTTP Request Completed', logDetails);
      } else {
        // Usando logger.http para manter o nível correto, mas passando o objeto detalhado
        logger.http('HTTP Request Completed', logDetails);
      }
    });

    next();
  }
}
