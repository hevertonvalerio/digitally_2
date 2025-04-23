import { createConnection, DeepPartial } from 'typeorm';
import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Client } from '../src/clients/entities/client.entity';
import { Appointment } from '../src/scheduler/entities/appointment.entity';
import { Notification } from '../src/notifications/entities/notification.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function migrateData() {
  // Carregar variáveis de ambiente
  dotenv.config();

  console.log('Iniciando migração de dados...');

  try {
    // Conectar ao SQLite
    console.log('Conectando ao SQLite...');
    const sqliteDb = await open({
      filename: path.resolve(__dirname, '../../database.sqlite'),
      driver: sqlite3.Database
    });

    // Conectar ao PostgreSQL
    console.log('Conectando ao PostgreSQL...');
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'projeto_digitaly',
      entities: [Client, Appointment, Notification],
      synchronize: false,
    });

    // 1. Migrar clientes
    console.log('Migrando clientes...');
    const clients = await sqliteDb.all('SELECT * FROM clients');
    for (const client of clients) {
      const clientData: DeepPartial<Client> = {
        id: client.id,
        clientName: client.client_name,
        cnpj: client.cnpj,
        internalToken: client.internal_token,
        twilioAccountSid: client.twilio_account_sid,
        twilioAuthToken: client.twilio_auth_token,
        twilioFromNumber: client.twilio_from_number,
        twilioTemplates: JSON.parse(client.twilio_templates),
        createdAt: new Date(client.created_at)
      };
      await connection.getRepository(Client).save(clientData);
    }
    console.log(`${clients.length} clientes migrados com sucesso!`);

    // 2. Migrar agendamentos
    console.log('Migrando agendamentos...');
    const appointments = await sqliteDb.all('SELECT * FROM appointments');
    for (const appointment of appointments) {
      const appointmentData: DeepPartial<Appointment> = {
        id: appointment.id,
        clientId: appointment.client_id,
        name: appointment.name,
        cellphone: appointment.cellphone,
        documentId: appointment.document_id,
        appointmentDate: new Date(appointment.appointment_date),
        appointmentTime: appointment.appointment_time,
        consultationType: appointment.consultation_type,
        notificationSent: Boolean(appointment.notification_sent),
        createdAt: new Date(appointment.created_at)
      };
      await connection.getRepository(Appointment).save(appointmentData);
    }
    console.log(`${appointments.length} agendamentos migrados com sucesso!`);

    // 3. Migrar notificações
    console.log('Migrando notificações...');
    const notifications = await sqliteDb.all('SELECT * FROM notifications');
    for (const notification of notifications) {
      const notificationData: DeepPartial<Notification> = {
        id: notification.id,
        clientId: notification.client_id,
        appointmentId: notification.appointment_id,
        messageType: notification.message_type,
        status: notification.status,
        whatsappMessageId: notification.whatsapp_message_id,
        response: notification.response,
        sentAt: new Date(notification.sent_at),
        responseAt: notification.response_at ? new Date(notification.response_at) : undefined,
        templateUsed: notification.template_used
      };
      await connection.getRepository(Notification).save(notificationData);
    }
    console.log(`${notifications.length} notificações migradas com sucesso!`);

    console.log('Migração concluída com sucesso!');

    await connection.close();
    await sqliteDb.close();
  } catch (error) {
    console.error('Erro durante a migração:', error);
    process.exit(1);
  }
}

// Executar migração
migrateData().catch(console.error);
