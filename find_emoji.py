import subprocess
import re

try:
    log = subprocess.check_output(['git', 'log', '-p', 'backend/app.py']).decode('utf-8', errors='ignore').split('\n')
    for line in log:
        if 'emoji' in line.lower() and ('+' in line or '-' in line):
            print(line.strip())
except Exception as e:
    print(e)
