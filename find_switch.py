import subprocess
import codecs

log = subprocess.check_output(['git', 'log', '-n', '30', '--pretty=format:%H']).decode('utf-8').split('\n')
for h in log:
    try:
        out = subprocess.check_output(['git', 'show', h + ':frontend/src/App.jsx']).decode('utf-8', errors='ignore')
        if 'omitir' in out.lower() or 'nombre_de_usuario' in out.lower() or 'switch' in out.lower() or 'read_username' in out.lower():
            print('Found suspicious keyword in commit', h)
            # Find the line
            for i, line in enumerate(out.split('\n')):
                if 'omitir' in line.lower() or 'nombre_de_usuario' in line.lower() or 'switch' in line.lower() or 'read_username' in line.lower():
                    print(f"Line {i}: {line.strip()}")
    except Exception as e:
        pass
