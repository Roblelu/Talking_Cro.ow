import sys

with open('backend/app.py', 'r', encoding='utf-8') as f:
    content = f.read()

injection = """
# ==========================================
# OBS OVERLAY SYNC
# ==========================================
overlay_events = []

@app.post("/api/overlay/push")
def push_overlay_event(event: dict):
    overlay_events.append(event)
    return {"status": "ok"}

@app.get("/api/overlay/pop")
def pop_overlay_events():
    global overlay_events
    events = overlay_events.copy()
    overlay_events.clear()
    return {"events": events}
"""

if "/api/overlay/push" not in content:
    content = content.replace('app = FastAPI(title="Talking Crow API")', 'app = FastAPI(title="Talking Crow API")\n' + injection)
    with open('backend/app.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Backend patched!")
else:
    print("Backend already patched.")
