export default () => {
  // Debug das variáveis de ambiente
  console.log('DEBUG - Variáveis de ambiente:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? '[DEFINIDO]' : '[NÃO DEFINIDO]');
  console.log('Diretório atual:', process.cwd());
  console.log('NODE_ENV:', process.env.NODE_ENV);

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    prefix: process.env.API_PREFIX || 'api',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
      toNumber: process.env.TWILIO_TO_NUMBER,
      contentSid: process.env.TWILIO_CONTENT_SID,
    },
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    whatsapp: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    },
    email: {
      user: process.env.EMAIL_USER || '',
      appPassword: process.env.EMAIL_APP_PASSWORD || '',
    },
  };
}; 