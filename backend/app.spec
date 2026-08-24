# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = ['edge_tts', 'httpx', 'requests', 'sqlite3', 'uvicorn', 'asyncio', 'database', 'tts_engine']
hiddenimports += collect_submodules('fastapi')
hiddenimports += collect_submodules('TikTokLive')
hiddenimports += collect_submodules('pydantic')


a = Analysis(
    ['pyarmor_dist/app.py'],
    pathex=['pyarmor_dist', '.'],
    binaries=[],
    datas=[],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
