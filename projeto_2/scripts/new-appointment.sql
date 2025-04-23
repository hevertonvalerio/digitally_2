-- Inserir agendamento de teste para receber notificação agora
INSERT INTO appointments (
    client_id,
    patient_name,
    patient_phone,
    cpf,
    appointment_date,
    appointment_time,
    appointment_type,
    specialty,
    status,
    notification_sent,
    created_at
) VALUES (
    1, -- ID do cliente Santa Casa Curitiba
    'Gustavo Fugulin',
    '+5511975657964',
    '12345678900',
    '2025-04-24', -- Data do agendamento (daqui a 40 horas)
    '10:45',      -- Horário do agendamento
    'consultation',
    'Consulta Geral',
    'scheduled',
    false,
    CURRENT_TIMESTAMP
); 