import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

# Inicialización de Firebase Admin
try:
    if os.path.exists('firebase-service-account.json'):
        cred = credentials.Certificate('firebase-service-account.json')
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()
except Exception as e:
    print(f"Error inicializando Firebase Admin: {e}")
    print("Asegúrate de que 'firebase-service-account.json' esté en la carpeta backend.")
    sys.exit(1)

db = firestore.client()

def main():
    print("==================================================")
    print("      ADMINISTRADOR DE TICKETS DE SOPORTE         ")
    print("==================================================")
    
    try:
        # Obtener todos los tickets, ordenados por fecha de creación (más antiguos primero)
        tickets_ref = db.collection('support_tickets').order_by('createdAt', direction=firestore.Query.ASCENDING).get()
    except Exception as e:
        print(f"Error al obtener los tickets: {e}")
        input("Presiona ENTER para salir...")
        return
        
    if not tickets_ref:
        print("\n¡Buenas noticias! No hay tickets de soporte pendientes.")
        input("Presiona ENTER para salir...")
        return

    print(f"\nSe encontraron {len(tickets_ref)} ticket(s).\n")
    
    for doc in tickets_ref:
        data = doc.to_dict()
        ticket_id = doc.id
        
        # Fecha en formato legible si existe
        date_str = "Desconocida"
        if 'createdAt' in data and data['createdAt']:
            date_str = data['createdAt'].strftime('%Y-%m-%d %H:%M:%S')

        print("-" * 50)
        print(f"ID Ticket : {ticket_id}")
        print(f"Fecha     : {date_str}")
        print(f"Usuario   : {data.get('username', 'N/A')} (UID: {data.get('uid', 'N/A')})")
        print(f"Email     : {data.get('email', 'N/A')}")
        print(f"Asunto    : {data.get('subject', 'N/A')}")
        print("Mensaje   :")
        print(f"  {data.get('message', 'N/A')}")
        print("-" * 50)
        
        while True:
            action = input("\n¿Deseas marcar este ticket como leído y ELIMINARLO? (y/n/q para salir): ").strip().lower()
            if action == 'y':
                try:
                    db.collection('support_tickets').document(ticket_id).delete()
                    print(f"✅ Ticket {ticket_id} eliminado exitosamente.")
                except Exception as e:
                    print(f"❌ Error al eliminar el ticket: {e}")
                break
            elif action == 'n':
                print(f"➡ Ticket {ticket_id} conservado en la base de datos.")
                break
            elif action == 'q':
                print("Saliendo del administrador...")
                return
            else:
                print("Opción no válida. Usa 'y', 'n' o 'q'.")
        
        print("\n")
        
    print("Has revisado todos los tickets.")
    input("Presiona ENTER para salir...")

if __name__ == "__main__":
    main()
