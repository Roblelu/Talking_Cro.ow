import subprocess

log = subprocess.check_output(['git', 'log', '-n', '20', '--pretty=format:%H']).decode('utf-8').split('\n')
found = False
for h in log:
    try:
        out = subprocess.check_output(['git', 'show', h + ':frontend/src/App.jsx']).decode('utf-8', errors='ignore')
        if 'dorado' in out.lower() or 'golden' in out.lower() or 'gold' in out.lower() or 'ffd700' in out.lower():
            print('Found in commit', h)
            found = True
    except Exception as e:
        pass
if not found:
    print('Not found')
