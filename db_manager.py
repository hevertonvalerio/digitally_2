import sqlite3
from datetime import datetime
import json

class DatabaseManager:
    def __init__(self, db_file='database.sqlite'):
        self.db_file = db_file
        self._create_tables()

    def _create_tables(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        # Clients table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            cnpj TEXT NOT NULL UNIQUE,
            internal_token TEXT NOT NULL UNIQUE,
            twilio_account_sid TEXT NOT NULL,
            twilio_auth_token TEXT NOT NULL,
            twilio_from_number TEXT NOT NULL,
            twilio_templates TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')

        # Appointments table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            cellphone TEXT NOT NULL,
            document_id TEXT NOT NULL,
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            consultation_type TEXT NOT NULL,
            notification_sent BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
        ''')

        # Notifications table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            appointment_id INTEGER,
            message_type TEXT NOT NULL,
            status TEXT NOT NULL,
            whatsapp_message_id TEXT,
            response TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            response_at TIMESTAMP,
            template_used TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (appointment_id) REFERENCES appointments(id)
        )
        ''')

        conn.commit()
        conn.close()

    def get_connection(self):
        return sqlite3.connect(self.db_file)

    # Client methods
    def create_client(self, client_name, cnpj, internal_token, twilio_account_sid, 
                     twilio_auth_token, twilio_from_number, twilio_templates):
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Ensure twilio_templates is valid JSON
            if isinstance(twilio_templates, list):
                twilio_templates = json.dumps(twilio_templates)
            
            cursor.execute('''
            INSERT INTO clients (
                client_name, cnpj, internal_token, 
                twilio_account_sid, twilio_auth_token, 
                twilio_from_number, twilio_templates
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (client_name, cnpj, internal_token, twilio_account_sid,
                 twilio_auth_token, twilio_from_number, twilio_templates))
            
            client_id = cursor.lastrowid
            conn.commit()
            return client_id
        except sqlite3.IntegrityError as e:
            raise ValueError("CNPJ or internal_token already exists")
        finally:
            conn.close()

    def get_client_by_id(self, client_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, client_name, cnpj, internal_token, 
               twilio_account_sid, twilio_auth_token, 
               twilio_from_number, twilio_templates, created_at
        FROM clients 
        WHERE id = ?
        ''', (client_id,))
        client = cursor.fetchone()
        conn.close()
        
        if client:
            return {
                'id': client[0],
                'client_name': client[1],
                'cnpj': client[2],
                'internal_token': client[3],
                'twilio_account_sid': client[4],
                'twilio_auth_token': client[5],
                'twilio_from_number': client[6],
                'twilio_templates': json.loads(client[7]),
                'created_at': client[8]
            }
        return None

    def get_client_by_token(self, internal_token):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, client_name, cnpj, internal_token, 
               twilio_account_sid, twilio_auth_token, 
               twilio_from_number, twilio_templates, created_at
        FROM clients 
        WHERE internal_token = ?
        ''', (internal_token,))
        client = cursor.fetchone()
        conn.close()
        
        if client:
            return {
                'id': client[0],
                'client_name': client[1],
                'cnpj': client[2],
                'internal_token': client[3],
                'twilio_account_sid': client[4],
                'twilio_auth_token': client[5],
                'twilio_from_number': client[6],
                'twilio_templates': json.loads(client[7]),
                'created_at': client[8]
            }
        return None

    def update_client(self, client_id, **kwargs):
        allowed_fields = {
            'client_name', 'cnpj', 'internal_token', 
            'twilio_account_sid', 'twilio_auth_token', 
            'twilio_from_number', 'twilio_templates'
        }
        
        update_fields = []
        values = []
        
        for key, value in kwargs.items():
            if key in allowed_fields:
                if key == 'twilio_templates' and isinstance(value, list):
                    value = json.dumps(value)
                update_fields.append(f"{key} = ?")
                values.append(value)
        
        if not update_fields:
            return False
        
        values.append(client_id)
        query = f'''
        UPDATE clients 
        SET {', '.join(update_fields)}
        WHERE id = ?
        '''
        
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, values)
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success

    def delete_client(self, client_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM clients WHERE id = ?', (client_id,))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success

    # Notification methods
    def add_notification(self, client_id, appointment_id, message_type, status, 
                        whatsapp_message_id=None, template_used=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO notifications (
            client_id, appointment_id, message_type, status,
            whatsapp_message_id, template_used
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (client_id, appointment_id, message_type, status,
              whatsapp_message_id, template_used))
        notification_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return notification_id

    def update_notification_response(self, notification_id, response, response_at=None):
        if response_at is None:
            response_at = datetime.now().isoformat()
            
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        UPDATE notifications 
        SET response = ?, response_at = ?, status = 'responded'
        WHERE id = ?
        ''', (response, response_at, notification_id))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success

    def get_notifications_by_appointment(self, appointment_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, client_id, appointment_id, message_type, status,
               whatsapp_message_id, response, sent_at, response_at, template_used
        FROM notifications 
        WHERE appointment_id = ?
        ORDER BY sent_at DESC
        ''', (appointment_id,))
        notifications = cursor.fetchall()
        conn.close()
        
        return [{
            'id': n[0],
            'client_id': n[1],
            'appointment_id': n[2],
            'message_type': n[3],
            'status': n[4],
            'whatsapp_message_id': n[5],
            'response': n[6],
            'sent_at': n[7],
            'response_at': n[8],
            'template_used': n[9]
        } for n in notifications]

    def get_notifications_by_client(self, client_id, start_date=None, end_date=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = '''
        SELECT id, client_id, appointment_id, message_type, status,
               whatsapp_message_id, response, sent_at, response_at, template_used
        FROM notifications 
        WHERE client_id = ?
        '''
        params = [client_id]
        
        if start_date and end_date:
            query += ' AND sent_at BETWEEN ? AND ?'
            params.extend([start_date, end_date])
        
        query += ' ORDER BY sent_at DESC'
        
        cursor.execute(query, params)
        notifications = cursor.fetchall()
        conn.close()
        
        return [{
            'id': n[0],
            'client_id': n[1],
            'appointment_id': n[2],
            'message_type': n[3],
            'status': n[4],
            'whatsapp_message_id': n[5],
            'response': n[6],
            'sent_at': n[7],
            'response_at': n[8],
            'template_used': n[9]
        } for n in notifications]

    # Appointment methods
    def add_appointment(self, client_id, name, cellphone, document_id, appointment_date, 
                       appointment_time, consultation_type):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO appointments (
            client_id, name, cellphone, document_id, 
            appointment_date, appointment_time, 
            consultation_type, notification_sent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
        ''', (client_id, name, cellphone, document_id, appointment_date, 
              appointment_time, consultation_type))
        appointment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return appointment_id

    def get_appointments_by_client(self, client_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, client_id, name, cellphone, document_id, 
               appointment_date, appointment_time, 
               consultation_type, notification_sent, created_at 
        FROM appointments 
        WHERE client_id = ?
        ''', (client_id,))
        appointments = cursor.fetchall()
        conn.close()
        return [self._convert_to_dict(appointment) for appointment in appointments]

    def get_all_appointments(self, client_id=None):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = '''
        SELECT id, client_id, name, cellphone, document_id, 
               appointment_date, appointment_time, 
               consultation_type, notification_sent, created_at 
        FROM appointments
        '''
        params = []
        
        if client_id:
            query += ' WHERE client_id = ?'
            params.append(client_id)
            
        cursor.execute(query, params)
        appointments = cursor.fetchall()
        conn.close()
        return [self._convert_to_dict(appointment) for appointment in appointments]

    def _convert_to_dict(self, appointment):
        if not appointment:
            return None
        return {
            'id': appointment[0],
            'client_id': appointment[1],
            'name': appointment[2],
            'cellphone': appointment[3],
            'document_id': appointment[4],
            'appointment_date': appointment[5],
            'appointment_time': appointment[6],
            'consultation_type': appointment[7],
            'notification_sent': bool(appointment[8]),
            'created_at': appointment[9]
        }
