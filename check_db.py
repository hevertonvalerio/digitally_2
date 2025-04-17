from db_manager import DatabaseManager

def check_database():
    db = DatabaseManager()
    
    print("\n=== Clients ===")
    client = db.get_client_by_id(1)
    print(f"Client Name: {client['client_name']}")
    print(f"CNPJ: {client['cnpj']}")
    print(f"WhatsApp Templates: {client['twilio_templates']}")
    
    print("\n=== Appointments ===")
    appointments = db.get_appointments_by_client(1)
    for appointment in appointments:
        print(f"\nPatient: {appointment['name']}")
        print(f"Date: {appointment['appointment_date']} at {appointment['appointment_time']}")
        print(f"Type: {appointment['consultation_type']}")
        print(f"Phone: {appointment['cellphone']}")
        print(f"Document ID: {appointment['document_id']}")
        
        # Get notifications for this appointment
        notifications = db.get_notifications_by_appointment(appointment['id'])
        for notif in notifications:
            print(f"Notification Status: {notif['status']}")
            print(f"Template Used: {notif['template_used']}")
            print(f"Message Type: {notif['message_type']}")
            if notif['response']:
                print(f"Response: {notif['response']}")
                print(f"Response Time: {notif['response_at']}")

if __name__ == "__main__":
    print("Checking database data...")
    check_database()
