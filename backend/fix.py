import re

with open('backend/app.py', 'r', encoding='utf-8') as f:
    code = f.read()

# First replace the on_connect to include the avatar fetch logic
on_connect_pattern = r'@client\.on\(ConnectEvent\)\s+async def on_connect\(event: ConnectEvent\):\s+global live_start_time\s+live_start_time = time\.time\(\)\s+print\(f"\[TikTok\] Conectado exitosamente\. Start time: \{live_start_time\}"\)'

on_connect_replacement = '''@client.on(ConnectEvent)
        async def on_connect(event: ConnectEvent):
            global live_start_time
            live_start_time = time.time()
            print(f"[TikTok] Conectado exitosamente. Start time: {live_start_time}")
            
            await broadcast_event(LiveEvent(type="connection", username="Sistema", message=f"Conectado a la sala de @{req.username}"))
            
            try:
                avatar = None
                if hasattr(client, 'room_info') and isinstance(client.room_info, dict):
                    url_list = client.room_info.get('owner', {}).get('avatar_thumb', {}).get('url_list', [])
                    if url_list and len(url_list) > 0:
                        avatar = url_list[0]
                if not avatar:
                    avatar = await get_tiktok_avatar(req.username)
                if not avatar and hasattr(client, 'get_avatar_url'):
                    avatar = await client.get_avatar_url(req.username)
                if avatar:
                    await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=avatar))
                else:
                    clean_username = req.username.strip('@')
                    fallback_avatar = f"https://ui-avatars.com/api/?name={clean_username}&background=random&color=fff&size=128&bold=true"
                    await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=fallback_avatar))
            except Exception as e:
                print(f"[Sistema WARNING] Error al obtener avatar: {e}")
                clean_username = req.username.strip('@')
                fallback_avatar = f"https://ui-avatars.com/api/?name={clean_username}&background=random&color=fff&size=128&bold=true"
                await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=fallback_avatar))'''

code = re.sub(on_connect_pattern, on_connect_replacement, code)

# Second, remove the block from run_client_safe
run_client_pattern = r'await broadcast_event\(LiveEvent\(type="connection", username="Sistema", message=f"Conectado a la sala de @\{req\.username\}"\)\)\s+try:\s+avatar = None\s+if hasattr\(client, \'room_info\'\) and isinstance\(client\.room_info, dict\):\s+url_list = client\.room_info\.get\(\'owner\', \{\}\)\.get\(\'avatar_thumb\', \{\}\)\.get\(\'url_list\', \[\]\)\s+if url_list and len\(url_list\) > 0:\s+avatar = url_list\[0\]\s+print\(f"\[Sistema\] Avatar obtenido de room_info: \{avatar\}"\)\s+if not avatar:\s+avatar = await get_tiktok_avatar\(req\.username\)\s+if not avatar and hasattr\(client, \'get_avatar_url\'\):\s+avatar = await client\.get_avatar_url\(req\.username\)\s+if avatar:\s+await broadcast_event\(LiveEvent\(type="room_info", username="Sistema", message=avatar\)\)\s+else:\s+clean_username = req\.username\.strip\(\'@\'\)\s+fallback_avatar = f"https://ui-avatars\.com/api/\?name=\{clean_username\}&background=random&color=fff&size=128&bold=true"\s+await broadcast_event\(LiveEvent\(type="room_info", username="Sistema", message=fallback_avatar\)\)\s+except Exception as e:\s+print\(f"\[Sistema WARNING\] Error al obtener avatar: \{e\}"\)\s+clean_username = req\.username\.strip\(\'@\'\)\s+fallback_avatar = f"https://ui-avatars\.com/api/\?name=\{clean_username\}&background=random&color=fff&size=128&bold=true"\s+await broadcast_event\(LiveEvent\(type="room_info", username="Sistema", message=fallback_avatar\)\)'

code = re.sub(run_client_pattern, '', code)

with open('backend/app.py', 'w', encoding='utf-8') as f:
    f.write(code)
