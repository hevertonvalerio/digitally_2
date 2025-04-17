import { createConnection, getConnection } from 'typeorm';
import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Client } from '../src/clients/entities/client.entity';
import { Appointment } from '../src/scheduler/entities/appointment.entity';
import { Notification } from '../src/notifications/entities/notification.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function cleanAndMigrate() {
  // Carregar variáveis de ambiente
  dotenv.config();
  
  console.log('Iniciando limpeza e migração...');
  
  try {
    // Conectar ao PostgreSQL (banco postgres padrão primeiro)
    console.log('Conectando ao PostgreSQL remoto...');
    const initialConnection = await createConnection({
      name: 'initial',
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: 'postgres', // Conecta ao banco padrão primeiro
      ssl: false
    });

    // Criar o banco de dados se não existir
    try {
      await initialConnection.query(`CREATE DATABASE "${process.env.POSTGRES_DB}"`);
    } catch (error) {
      if (error.code !== '42P04') { // Ignora erro se o banco já existe
        throw error;
      }
    }

    await initialConnection.close();

    // Conectar ao banco de dados do projeto
    console.log('Conectando ao banco de dados do projeto...');
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [Client, Appointment, Notification],
      synchronize: false,
      ssl: false
    });
    
    // Limpar tabelas existentes
    console.log('Removendo tabelas existentes...');
    const queryRunner = connection.createQueryRunner();
    await queryRunner.query('DROP SCHEMA public CASCADE');
    await queryRunner.query('CREATE SCHEMA public');
    await queryRunner.query('GRANT ALL ON SCHEMA public TO postgres');
    await queryRunner.query('GRANT ALL ON SCHEMA public TO public');
    
    // Criar novas tabelas
    console.log('Criando novas tabelas...');
    await connection.synchronize();
    
    // Conectar ao SQLite
    console.log('Conectando ao SQLite...');
    const sqliteDb = await open({
      filename: path.resolve(__dirname, '../../database.sqlite'),
      driver: sqlite3.Database
    });

    // 1. Migrar clientes
    console.log('Migrando clientes...');
    const clients = await sqliteDb.all('SELECT * FROM clients');
    for (const client of clients) {
      const clientData = {
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
      const appointmentData = {
        id: appointment.id,
        clientId: appointment.client_id,
        patientName: appointment.name,
        patientPhone: appointment.cellphone,
        cpf: appointment.document_id,
        appointmentDate: new Date(appointment.appointment_date),
        appointmentTime: appointment.appointment_time,
        appointmentType: appointment.consultation_type === 'consultation' ? ('consultation' as const) : ('procedure' as const),
        specialty: 'Consulta Geral',
        status: 'scheduled' as const,
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
      const notificationData = {
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

// Executar
cleanAndMigrate().catch(console.error);
