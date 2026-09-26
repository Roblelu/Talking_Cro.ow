"""Fail publication if expected runtime files or secret exclusions are wrong."""
import hashlib
import base64
from pathlib import Path
import sys

folder = Path(sys.argv[1]).resolve()
version = sys.argv[2]
manifest = (folder / 'latest.yml').read_text()
assert f'version: {version}' in manifest, 'Wrong updater version'
exe = folder / f'Talking_Cro.ow_{version}.exe'
digest = base64.b64encode(hashlib.sha512(exe.read_bytes()).digest()).decode()
assert digest in manifest, 'Updater checksum mismatch'

backend = folder / 'win-unpacked/resources/backend'
assert (backend / 'app.exe').exists(), 'Missing compiled backend app.exe'

# Validar que no hay archivos python crudos filtrados
assert len(list(backend.glob('*.py'))) == 0, 'Unexpected Python source files found in release!'

print('Release verified: version, checksum, and compiled runtime exclusions.')
