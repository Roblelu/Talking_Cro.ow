import firebase_admin
from firebase_admin import credentials, firestore

try:
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(e)

db = firestore.client()
docs = db.collection('users').where('tiktok_username', '==', '@hevelgate').limit(1).get()
if not docs:
    print('User NOT FOUND')
else:
    for doc in docs:
        print(doc.to_dict())
