import firebase_admin
from firebase_admin import credentials, firestore
import os

# INSTRUCCIONES:
# 1. Asegúrate de tener el archivo de credenciales de servicio (serviceAccountKey.json) 
#    de tu proyecto de Firebase descargado en la carpeta backend/scripts.
# 2. Ejecuta este script desde la terminal: python migrate_legacy.py

def main():
    print("========================================")
    print("Iniciando Migración de Cuentas Legacy")
    print("========================================")
    
    cred_path = "../firebase-service-account.json"
    if not os.path.exists(cred_path):
        print(f"[ERROR] No se encontró el archivo de credenciales en: {cred_path}")
        print("Debes descargar la clave privada desde Firebase Console -> Project Settings -> Service Accounts.")
        return

    # Inicializar Firebase
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    users_ref = db.collection("users")
    
    # 1. Obtener todos los documentos
    all_users = list(users_ref.stream())
    
    legacy_docs = []
    modern_docs = []
    
    for doc in all_users:
        if doc.id.startswith("@"):
            legacy_docs.append(doc)
        else:
            modern_docs.append(doc)
            
    print(f"Total de usuarios escaneados: {len(all_users)}")
    print(f"Cuentas Legacy (con @): {len(legacy_docs)}")
    print(f"Cuentas Modernas (UID): {len(modern_docs)}")
    
    if len(legacy_docs) == 0:
        print("No hay cuentas legacy para migrar.")
        return

    # 2. Mapear cuentas modernas por tiktok_username
    modern_map_by_tiktok = {}
    for doc in modern_docs:
        data = doc.to_dict()
        if data and "tiktok_username" in data:
            tiktok = data["tiktok_username"].strip().lower()
            if not tiktok.startswith("@"):
                tiktok = "@" + tiktok
            modern_map_by_tiktok[tiktok] = doc.id
            
    # 3. Procesar cuentas legacy
    migrated_count = 0
    pending_count = 0
    
    for legacy_doc in legacy_docs:
        legacy_id = legacy_doc.id.lower()
        legacy_data = legacy_doc.to_dict()
        
        # Ignorar si ya fue migrado
        if legacy_data.get("migrated"):
            continue
            
        target_uid = modern_map_by_tiktok.get(legacy_id)
        
        if target_uid:
            print(f"-> Migrando {legacy_doc.id} hacia el UID moderno {target_uid}...")
            
            # Obtener saldos a transferir
            credits_to_transfer = legacy_data.get("creator_credits", 0)
            purchased_to_transfer = legacy_data.get("purchased_croins", 0)
            
            if credits_to_transfer > 0 or purchased_to_transfer > 0:
                # Transacción para seguridad
                target_ref = users_ref.document(target_uid)
                legacy_ref = users_ref.document(legacy_doc.id)
                
                try:
                    target_ref.update({
                        "creator_credits": firestore.Increment(credits_to_transfer),
                        "purchased_croins": firestore.Increment(purchased_to_transfer),
                    })
                    # Marcar legacy como migrado para no volver a sumar
                    legacy_ref.update({
                        "migrated": True,
                        "migrated_to": target_uid,
                        "migrated_credits": credits_to_transfer,
                        "migrated_croins": purchased_to_transfer,
                        "creator_credits": 0,
                        "purchased_croins": 0
                    })
                    print(f"   [OK] Transferidos {credits_to_transfer} créditos y {purchased_to_transfer} Croins.")
                    migrated_count += 1
                except Exception as e:
                    print(f"   [ERROR] Falló la transferencia: {e}")
            else:
                print(f"   [INFO] {legacy_doc.id} no tenía saldo. Se marca como migrada.")
                users_ref.document(legacy_doc.id).update({
                    "migrated": True,
                    "migrated_to": target_uid
                })
        else:
            pending_count += 1
            print(f"-> [PENDIENTE] {legacy_doc.id}: No se encontró una cuenta moderna (UID) que haya registrado este tiktok_username.")
            
    print("========================================")
    print("Resumen de Migración:")
    print(f"Migradas con éxito hoy: {migrated_count}")
    print(f"Pendientes (esperando que creen cuenta en la web): {pending_count}")
    print("========================================")

if __name__ == "__main__":
    main()
