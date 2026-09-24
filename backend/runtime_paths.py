"""Shared writable storage for script, embedded Python and compiled builds."""
import os
from contextlib import closing
import shutil
import sqlite3
import sys
from pathlib import Path


def get_data_dir():
    source = Path(__file__).resolve().parent
    configured = os.environ.get("TALKING_CROW_DATA_DIR")
    if configured:
        target = Path(configured).resolve()
    elif getattr(sys, "frozen", False) or "__compiled__" in globals():
        target = Path(os.environ["APPDATA"]) / "TalkingCrow"
    else:
        target = source
    target.mkdir(parents=True, exist_ok=True)
    # Preserve existing installations; never replace data already in the target.
    if target != source:
        for name in ("config.json", "local_config.json", "database.db"):
            old, new = source / name, target / name
            if old.exists() and not new.exists():
                if name == "database.db":
                    with closing(sqlite3.connect(str(old))) as src, closing(sqlite3.connect(str(new))) as dst:
                        src.backup(dst)
                else:
                    shutil.copy2(old, new)
    return str(target)
