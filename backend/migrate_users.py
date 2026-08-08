import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
import json

# Buscar el archivo de credenciales de servicio (Service Account)
# Asumiremos que el usuario tiene un firebase-adminsdk.json, pero por defecto 
# usaremos las credenciales por defecto de la app si existen, o si no le pediremos que consiga una.
# Como el Backend ya usaba firebase_admin, veamos si hay credenciales.
try:
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred)
except:
    try:
        firebase_admin.initialize_app()
    except Exception as e:
        print(f"Error inicializando Firebase Admin: {e}")
        print("Asegúrate de ejecutar el script con acceso a Firebase (ej. GOOGLE_APPLICATION_CREDENTIALS o un certificado).")
        exit(1)

db = firestore.client()

def migrate_legacy_users():
    fans_ref = db.collection('streamers').document('vridel').collection('fans')
    docs = fans_ref.stream()
    
    migrated_count = 0
    skipped_count = 0
    error_count = 0
    
    for doc in docs:
        data = doc.to_dict()
        doc_id = doc.id
        
        # Detectar si es un documento heredado: 
        # 1. Tiene PII expuesta (email o phone).
        # 2. El ID suele ser el username en lugar de un UID de 28 caracteres.
        if 'email' in data:
            print(f"Migrando cuenta heredada: {doc_id} (email: {data['email']})")
            
            try:
                # Obtener el verdadero UID desde Firebase Auth
                user_record = auth.get_user_by_email(data['email'])
                uid = user_record.uid
                
                if uid == doc_id:
                    # Extrañamente el ID ya era el UID pero los datos estaban revueltos.
                    print(f"  El ID ya es el UID. Solo separaremos la PII.")
                
                # 1. Crear el nuevo documento base (sin PII)
                new_profile = {
                    'Croins': data.get('Croins', 0),
                    'isPro': data.get('isPro', False),
                    'username': data.get('username', doc_id),
                    'createdAt': data.get('createdAt', firestore.SERVER_TIMESTAMP)
                }
                db.collection('streamers').document('vridel').collection('fans').document(uid).set(new_profile)
                
                # 2. Crear el documento privado (con PII)
                private_contact = {
                    'email': data.get('email'),
                    'phone': data.get('phone', '')
                }
                db.collection('streamers').document('vridel').collection('fans').document(uid).collection('private').document('contact').set(private_contact)
                
                # 3. Borrar el documento antiguo si el ID era diferente
                if uid != doc_id:
                    fans_ref.document(doc_id).delete()
                    print(f"  ✅ Documento '{doc_id}' migrado a '{uid}' y eliminado.")
                else:
                    # Si el ID era el mismo, solo borramos los campos sensibles del documento público
                    fans_ref.document(doc_id).update({
                        'email': firestore.DELETE_FIELD,
                        'phone': firestore.DELETE_FIELD
                    })
                    print(f"  ✅ PII extraída y movida a subcolección para '{uid}'.")
                    
                migrated_count += 1
            except auth.UserNotFoundError:
                print(f"  ❌ Error: El usuario con email {data['email']} no existe en Firebase Auth.")
                error_count += 1
            except Exception as e:
                print(f"  ❌ Error migrando {doc_id}: {str(e)}")
                error_count += 1
        else:
            skipped_count += 1

    print("=" * 40)
    print("REPORTE DE MIGRACIÓN (TC-19)")
    print(f"Cuentas migradas/reparadas: {migrated_count}")
    print(f"Cuentas ya modernas (saltadas): {skipped_count}")
    print(f"Errores: {error_count}")
    print("=" * 40)

if __name__ == "__main__":
    migrate_legacy_users()
