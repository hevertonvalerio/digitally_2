import { createConnection } from 'typeorm';
import { Appointment } from '../src/scheduler/entities/appointment.entity';
import { Client } from '../src/clients/entities/client.entity';
import { Notification } from '../src/notifications/entities/notification.entity';
import * as dotenv from 'dotenv';

async function checkNullDates() {
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
    ssl: false
  });
  try {
    const appointments = await connection.getRepository(Appointment)
      .createQueryBuilder('appointment')
      .where('appointment.appointment_date IS NULL')
      .getMany();
    
    console.log('Agendamentos com datas nulas:', appointments.length);
    if (appointments.length > 0) {
      console.log('IDs dos agendamentos:', appointments.map(a => a.id));
    }
  } catch (error) {
    console.error('Erro ao verificar datas:', error);
  } finally {
    await connection.close();
  }
}

checkNullDates().catch(console.error);