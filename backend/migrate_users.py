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

def migrate_fans_to_donadores():
    fans_ref = db.collection('streamers').document('vridel').collection('fans')
    donadores_ref = db.collection('streamers').document('vridel').collection('donadores')
    docs = fans_ref.stream()
    
    migrated_count = 0
    error_count = 0
    
    print("Iniciando migración de 'fans' a 'donadores'...")
    
    for doc in docs:
        data = doc.to_dict()
        uid = doc.id
        
        print(f"Migrando cuenta: {uid}...")
        
        try:
            # 1. Copiar el documento base
            donadores_ref.document(uid).set(data)
            
            # 2. Copiar la subcolección privada si existe
            private_contact_ref = fans_ref.document(uid).collection('private').document('contact')
            private_contact_doc = private_contact_ref.get()
            
            if private_contact_doc.exists:
                donadores_ref.document(uid).collection('private').document('contact').set(private_contact_doc.to_dict())
                # Borrar el documento privado original
                private_contact_ref.delete()
            
            # 3. Borrar el documento original en fans
            fans_ref.document(uid).delete()
            
            print(f"  ✅ Cuenta '{uid}' migrada exitosamente.")
            migrated_count += 1
            
        except Exception as e:
            print(f"  ❌ Error migrando {uid}: {str(e)}")
            error_count += 1

    print("=" * 40)
    print("REPORTE DE MIGRACIÓN")
    print(f"Cuentas migradas: {migrated_count}")
    print(f"Errores: {error_count}")
    print("=" * 40)

if __name__ == "__main__":
    migrate_fans_to_donadores()
