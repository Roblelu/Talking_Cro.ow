import subprocess
import codecs

with codecs.open('git_log_app.txt', 'r', encoding='utf-16', errors='ignore') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "dorado" in line.lower() or "gold" in line.lower() or "ffd700" in line.lower() or "tts" in line.lower():
        if "evt.type" in line or "background:" in line or "color:" in line:
            print(f"Line {i}: {line.strip()}")
