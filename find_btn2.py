import subprocess
import re

try:
    log = subprocess.check_output(['git', 'log', '-p', 'frontend/src/App.jsx']).decode('utf-8', errors='ignore')
    
    # We want to find a block of code added (+) that contains <button and croins
    blocks = log.split('commit ')
    for block in blocks:
        if '<button' in block.lower() and ('croins' in block.lower() or 'creditos' in block.lower() or 'superusuario' in block.lower()):
            lines = [line for line in block.split('\n') if line.startswith('+') and not line.startswith('+++')]
            text = '\n'.join(lines)
            if '<button' in text.lower() and ('croins' in text.lower() or 'super' in text.lower() or 'credito' in text.lower()):
                print(f"--- MATCH IN COMMIT ---")
                for line in lines:
                    if 'button' in line.lower() or 'croin' in line.lower() or 'super' in line.lower():
                        print(line.strip())
                print("-----------------------\n")
except Exception as e:
    print(e)
