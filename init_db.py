# init_db.py
from db_manager import DatabaseManager
import os
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do .env
load_dotenv()

def init_db():
    db_manager = DatabaseManager()

    # Dados iniciais de exemplo para popular a tabela consultas
    dados_exemplo = [
        ('João Silva', '(11) 99999-9999', '11122233344', '2025-05-20', '14:30', 'Consulta'),
        ('Maria Santos', '(11) 88888-8888', '55566677788', '2025-05-21', '10:00', 'Consulta'),
        ('Pedro Oliveira', '(11) 77777-7777', '99900011122', '2025-05-22', '15:45', 'Exame'),
        ('Ana Costa', '(11) 66666-6666', '33344455566', '2025-05-23', '09:15', 'Procedimento'),
        ('Carlos Souza', '(11) 55555-5555', '77788899900', '2025-05-24', '11:30', 'Consulta')
    ]

    for nome, telefone, cpf, data_consulta, hora_consulta, tipo_consulta in dados_exemplo:
        db_manager.add_consulta(nome, telefone, cpf, data_consulta, hora_consulta, tipo_consulta)

    db_manager.close_connection()
    print("✅ Banco de dados PostgreSQL inicializado com sucesso!")

if __name__ == '__main__':
    init_db()
