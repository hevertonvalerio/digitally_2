import sqlite3
from datetime import datetime

def init_db():
    # Conectar ao banco de dados (criará o arquivo se não existir)
    conn = sqlite3.connect('database.sqlite')
    cursor = conn.cursor()

    # Criar a tabela de consultas
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS consultas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT NOT NULL,
        consulta_agendada BOOLEAN DEFAULT 0,
        consulta_confirmada BOOLEAN DEFAULT 0,
        data_consulta DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Inserir alguns dados de exemplo
    dados_exemplo = [
        ('João Silva', '(11) 99999-9999', 1, 1, '2024-03-20 14:30:00'),
        ('Maria Santos', '(11) 88888-8888', 1, 0, '2024-03-21 10:00:00'),
        ('Pedro Oliveira', '(11) 77777-7777', 0, 0, '2024-03-22 15:45:00'),
        ('Ana Costa', '(11) 66666-6666', 1, 1, '2024-03-23 09:15:00'),
        ('Carlos Souza', '(11) 55555-5555', 1, 0, '2024-03-24 11:30:00')
    ]

    cursor.executemany('''
    INSERT INTO consultas (nome, telefone, consulta_agendada, consulta_confirmada, data_consulta)
    VALUES (?, ?, ?, ?, ?)
    ''', dados_exemplo)

    # Commit das alterações
    conn.commit()

    # Fechar a conexão
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Banco de dados inicializado com sucesso!") 