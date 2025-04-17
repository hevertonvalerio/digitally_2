import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Appointment } from '../../scheduler/entities/appointment.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId: number;

  @Column({ name: 'message_type' })
  messageType: string;

  @Column()
  status: string;

  @Column({ name: 'whatsapp_message_id', nullable: true })
  whatsappMessageId: string;

  @Column({ nullable: true })
  response: string;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;

  @Column({ name: 'response_at', type: 'timestamp', nullable: true })
  responseAt: Date;

  @Column({ name: 'template_used', nullable: true })
  templateUsed: string;

  @ManyToOne(() => Client, client => client.notifications)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Appointment, appointment => appointment.notifications)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;
}
