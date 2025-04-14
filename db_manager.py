import sqlite3
from datetime import datetime

class DatabaseManager:
    def __init__(self, db_file='database.sqlite'):
        self.db_file = db_file
        self._create_tables()

    def _create_tables(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS consultas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cellphone TEXT NOT NULL,
            cpf TEXT NOT NULL,
            appointment_date DATE NOT NULL,
            appointment_hour TIME NOT NULL,
            type_consultation TEXT NOT NULL,
            notification_sent BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        conn.commit()
        conn.close()

    def get_connection(self):
        return sqlite3.connect(self.db_file)

    def get_all_consultas(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, cellphone, cpf, 
                   appointment_date, appointment_hour, 
                   type_consultation, notification_sent, created_at 
            FROM consultas
        ''')
        consultas = cursor.fetchall()
        conn.close()
        return [self._convert_to_dict(consulta) for consulta in consultas]

    def get_consulta_by_id(self, consulta_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, cellphone, cpf, 
                   appointment_date, appointment_hour, 
                   type_consultation, notification_sent, created_at 
            FROM consultas 
            WHERE id = ?
        ''', (consulta_id,))
        consulta = cursor.fetchone()
        conn.close()
        return self._convert_to_dict(consulta) if consulta else None

    def add_consulta(self, name, cellphone, cpf, appointment_date, appointment_hour, type_consultation):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO consultas (
            name, cellphone, cpf, 
            appointment_date, appointment_hour, 
            type_consultation, notification_sent
        )
        VALUES (?, ?, ?, ?, ?, ?, FALSE)
        ''', (name, cellphone, cpf, appointment_date, appointment_hour, type_consultation))
        conn.commit()
        consulta_id = cursor.lastrowid
        conn.close()
        return consulta_id

    def update_notification_status(self, consulta_id, notification_sent):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        UPDATE consultas 
        SET notification_sent = ?
        WHERE id = ?
        ''', (notification_sent, consulta_id))
        conn.commit()
        conn.close()

    def delete_consulta(self, consulta_id):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM consultas WHERE id = ?', (consulta_id,))
        conn.commit()
        conn.close()

    def get_consultas_by_date_range(self, start_date, end_date):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, name, cellphone, cpf, 
               appointment_date, appointment_hour, 
               type_consultation, notification_sent, created_at 
        FROM consultas 
        WHERE appointment_date BETWEEN ? AND ?
        ''', (start_date, end_date))
        consultas = cursor.fetchall()
        conn.close()
        return [self._convert_to_dict(consulta) for consulta in consultas]

    def _convert_to_dict(self, consulta):
        if not consulta:
            return None
        return {
            'id': consulta[0],
            'name': consulta[1],
            'cellphone': consulta[2],
            'cpf': consulta[3],
            'appointment_date': consulta[4],
            'appointment_hour': consulta[5],
            'type_consultation': consulta[6],
            'notification_sent': bool(consulta[7]),
            'created_at': consulta[8]
        } 