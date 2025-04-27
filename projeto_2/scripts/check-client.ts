import { createConnection } from 'typeorm';
import { Client } from '../src/clients/entities/client.entity';
import { Appointment } from '../src/scheduler/entities/appointment.entity';
import { Notification } from '../src/notifications/entities/notification.entity';
import * as dotenv from 'dotenv';

async function checkClientNumber() {
  dotenv.config();
  
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [Client, Appointment, Notification],
    synchronize: false,
    ssl: true
  });

  try {
    const client = await connection.getRepository(Client).findOne({ where: { id: 1 } });
    console.log('Client Twilio Number:', client?.twilioFromNumber);
    console.log('Full client data:', client);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.close();
  }
}

checkClientNumber().catch(console.error);