import subprocess
import codecs

try:
    log = subprocess.check_output(['git', 'log', '-p', 'backend/app.py']).decode('utf-8', errors='ignore')
    lines = log.split('\n')
    for line in lines:
        if 'nombre' in line.lower() or 'read_name' in line.lower() or 'include_name' in line.lower() or 'switch' in line.lower() or 'dice' in line.lower() or 'says' in line.lower():
            if line.startswith('+') or line.startswith('-'):
                print(line.strip())
except Exception as e:
    print(e)
