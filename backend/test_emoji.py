
import re
text = 'Saludos pequeña ????ñ'
filtered = re.sub(r'[^\w\s.,!?¿¡\'\x22-]', '', text)
print(filtered)

