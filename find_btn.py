import subprocess
import re

try:
    log = subprocess.check_output(['git', 'log', '-p', 'frontend/src/App.jsx']).decode('utf-8', errors='ignore').split('\n')
    for i, line in enumerate(log):
        if 'croins' in line.lower() or 'creditos' in line.lower() or 'superusuario' in line.lower() or 'admin' in line.lower() or 'otorgar' in line.lower() or 'regalar' in line.lower():
            if '+' in line and '<button' in line:
                print(line.strip()[:100])
except Exception as e:
    print(e)
