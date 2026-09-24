with open('frontend/main.cjs', 'r', encoding='latin-1') as f:
    c = f.read()
c = c.replace("equire('electron') directo al frontend.", "// require('electron') directo al frontend.")
with open('frontend/main.cjs', 'w', encoding='utf-8') as f:
    f.write(c)
    
import json
with open('frontend/package.json', 'r', encoding='utf-8') as f:
    p = json.load(f)
p['version'] = '1.2.9'
with open('frontend/package.json', 'w', encoding='utf-8') as f:
    json.dump(p, f, indent=2)
