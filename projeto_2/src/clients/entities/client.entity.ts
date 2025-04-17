import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Appointment } from '../../scheduler/entities/appointment.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_name' })
  clientName: string;

  @Column({ unique: true })
  cnpj: string;

  @Column({ name: 'internal_token', unique: true })
  internalToken: string;

  @Column({ name: 'twilio_account_sid' })
  twilioAccountSid: string;

  @Column({ name: 'twilio_auth_token' })
  twilioAuthToken: string;

  @Column({ name: 'twilio_from_number' })
  twilioFromNumber: string;

  @Column({ name: 'twilio_templates', type: 'jsonb' })
  twilioTemplates: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Appointment, appointment => appointment.client)
  appointments: Appointment[];

  @OneToMany(() => Notification, notification => notification.client)
  notifications: Notification[];
}
