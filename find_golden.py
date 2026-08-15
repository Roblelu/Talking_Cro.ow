import subprocess
import re

try:
    log = subprocess.check_output(['git', 'log', '-p', 'frontend/src/App.jsx']).decode('utf-8', errors='ignore').split('\n')
    for i, line in enumerate(log):
        if 'dorado' in line.lower() or 'golden' in line.lower() or 'audio' in line.lower():
            if '+' in line or '-' in line:
                print(line.strip()[:100])
except Exception as e:
    print(e)
