import firebase_admin
from firebase_admin import credentials, auth
import sys

try:
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred)
except ValueError:
    pass # Ya inicializado
except Exception:
    firebase_admin.initialize_app()

email = "roblecro.ow@gmail.com"
try:
    user = auth.get_user_by_email(email)
    print(f"User exists! UID: {user.uid}")
except auth.UserNotFoundError:
    print(f"User {email} NOT FOUND in Firebase Auth.")
except Exception as e:
    print(f"Error: {e}")
