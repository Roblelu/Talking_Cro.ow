import firebase_admin
from firebase_admin import credentials, firestore
import os

def main():
    print("========================================")
    print("Iniciando Migración de Fase 3 (PII y Zero Trust)")
    print("========================================")
    
    cred_path = "../firebase-service-account.json"
    if not os.path.exists(cred_path):
        print(f"[ERROR] No se encontró la clave en: {cred_path}")
        return

    # Inicializar Firebase
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    users_ref = db.collection("users")
    
    all_users = list(users_ref.stream())
    print(f"Total de usuarios escaneados: {len(all_users)}")
    
    pii_migrated_count = 0
    
    for doc in all_users:
        if doc.id.startswith("@"):
            # Las cuentas legacy se tratan en otro momento o se ignoran si ya no hay usuarios reales
            continue
            
        data = doc.to_dict()
        if not data:
            continue
            
        uid = doc.id
        updates = {}
        private_data = {}
        
        # Detectar PII en el documento principal
        for pii_field in ["email", "phone", "phoneNumber", "correo", "celular"]:
            if pii_field in data:
                private_data[pii_field] = data[pii_field]
                updates[pii_field] = firestore.DELETE_FIELD
        
        if updates:
            print(f"-> Migrando PII para el usuario {uid}...")
            try:
                # 1. Guardar en subcolección privada
                private_ref = users_ref.document(uid).collection("private").document("contact")
                private_ref.set(private_data, merge=True)
                
                # 2. Eliminar del documento principal
                users_ref.document(uid).update(updates)
                
                print(f"   [OK] PII migrado correctamente a private/contact.")
                pii_migrated_count += 1
            except Exception as e:
                print(f"   [ERROR] Falló la migración PII para {uid}: {e}")
                
    print("========================================")
    print("Resumen de Fase 3:")
    print(f"Cuentas con PII migrado: {pii_migrated_count}")
    print("========================================")

if __name__ == "__main__":
    main()
