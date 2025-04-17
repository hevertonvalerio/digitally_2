import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'patient_name' })
  patientName: string;

  @Column({ name: 'patient_phone' })
  patientPhone: string;

  @Column()
  cpf: string;

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: Date;

  @Column({ name: 'appointment_time', type: 'time' })
  appointmentTime: string;

  @Column({
    type: 'enum',
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed'],
    default: 'scheduled'
  })
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

  @Column({ name: 'notification_sent', default: false })
  notificationSent: boolean;

  @Column({ name: 'notification_date', type: 'timestamp', nullable: true })
  notificationDate: Date;

  @Column()
  specialty: string;

  @Column({
    name: 'appointment_type',
    type: 'enum',
    enum: ['consultation', 'procedure']
  })
  appointmentType: 'consultation' | 'procedure';

  @Column({ name: 'exam_protocol', nullable: true })
  examProtocol: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ name: 'last_interaction', type: 'timestamp', nullable: true })
  lastInteraction: Date;

  @Column({ name: 'last_status', nullable: true })
  lastStatus: string;

  @Column({ name: 'last_response', nullable: true })
  lastResponse: string;

  @Column({ name: 'confirmation_date', type: 'timestamp', nullable: true })
  confirmationDate: Date;

  @Column({ name: 'confirmation_response', nullable: true })
  confirmationResponse: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Client, client => client.appointments)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @OneToMany(() => Notification, notification => notification.appointment)
  notifications: Notification[];
}
