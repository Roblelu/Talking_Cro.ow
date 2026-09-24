_q='pending'
_p='audio_id'
_o='comment'
_n='/api/audio/{filename}'
_m='audio_queue'
_l='audio_url'
_k='/api/tts/state'
_j='required_gift'
_i='enabled'
_h='Usuario'
_g='Desconectado del directo'
_f='/api/settings'
_e='tts_read_username'
_d='/api/gifts'
_c='tts_voice'
_b='bearer '
_a='https://talking-crow.web.app'
_Z='config.json'
_Y='frozen'
_X='uniqueId'
_W='tts_delay'
_V='script'
_U='value'
_T='name'
_S='tts_volume'
_R='tts_rate'
_Q='es-MX-DaliaNeural'
_P='port'
_O='error'
_N='connection'
_M='Authorization'
_L='username'
_K='All'
_J='id'
_I='api_key'
_H='message'
_G='Sistema'
_F='+0%'
_E=False
_D=True
_C='ok'
_B=None
_A='status'
import os,json,sqlite3,asyncio
from fastapi import FastAPI,HTTPException,BackgroundTasks,UploadFile,File,Form,Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List,Optional
import threading,shutil,uuid,sys,httpx,requests
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent,CommentEvent,GiftEvent,DisconnectEvent
from TikTokLive.client.web.web_settings import WebDefaults
WebDefaults.sign_api_key=''
import database,tts_engine,secrets
def get_base_dir():
	if getattr(sys,_Y,_E):return os.path.dirname(sys.executable)
	return os.path.dirname(os.path.abspath(__file__))
def get_data_dir():
	if getattr(sys,_Y,_E):app_data=os.path.join(os.environ.get('APPDATA',''),'TalkingCrow');os.makedirs(app_data,exist_ok=_D);return app_data
	return os.path.dirname(os.path.abspath(__file__))
os.environ['PATH']+=os.pathsep+get_base_dir()
config_path=os.path.join(get_data_dir(),_Z)
local_config_path=os.path.join(get_data_dir(),'local_config.json')
def init_config():
	if not os.path.exists(config_path):
		with open(config_path,'w')as f:json.dump({'test':_D},f)
	if not os.path.exists(local_config_path):
		with open(local_config_path,'w')as f:json.dump({_I:str(uuid.uuid4()),'web_link':_a},f,indent=4)
init_config()
config_data={_P:8763}
if os.path.exists(config_path):
	try:
		with open(config_path,'r')as f:config_data=json.load(f)
	except Exception:pass
local_config_data={}
if os.path.exists(local_config_path):
	try:
		with open(local_config_path,'r')as f:local_config_data=json.load(f)
	except Exception:local_config_data={}
if _I not in local_config_data:
	local_config_data[_I]=secrets.token_hex(16)
	with open(local_config_path,'w')as f:json.dump(local_config_data,f,indent=4)
LOCAL_API_KEY=local_config_data[_I]
print(f"\n{'='*50}\n--- Tu API Key Local es: {LOCAL_API_KEY} ---\n{'='*50}\n")
from fastapi import Depends
from fastapi.security import APIKeyHeader
api_key_header=APIKeyHeader(name=_M,auto_error=_E)
async def verify_token(api_key=Depends(api_key_header)):
	if not api_key:raise HTTPException(status_code=401,detail='Token requerido (Authorization: Bearer <token>)')
	token=api_key[7:].strip()if api_key.lower().startswith(_b)else api_key.strip()
	if token!=LOCAL_API_KEY:raise HTTPException(status_code=403,detail='Token inválido')
	return token
async def verify_token_query(req,token=_B):
	auth_header=req.headers.get(_M);header_token=auth_header[7:].strip()if auth_header and auth_header.lower().startswith(_b)else _B;final_token=token if token else header_token
	if not final_token or final_token!=LOCAL_API_KEY:raise HTTPException(status_code=403,detail='Token inválido o ausente')
	return final_token
import tts_engine
from contextlib import asynccontextmanager
import threading,asyncio
async def audio_cleanup_loop():
	while _D:
		try:await asyncio.sleep(1800);tts_engine.tts_engine.cleanup_old_files(max_age_seconds=7200,max_total_mb=500)
		except asyncio.CancelledError:break
		except Exception as e:print(f"[Limpieza TTS] Error en limpieza automática: {e}")
@asynccontextmanager
async def lifespan_context(app):database.init_db();threading.Thread(target=tts_engine.tts_engine.load,daemon=_D).start();global tts_queue;tts_queue=asyncio.Queue(maxsize=100);tts_engine.tts_engine.cleanup_old_files(max_age_seconds=7200,max_total_mb=500);worker_task=asyncio.create_task(tts_worker_loop());cleanup_task=asyncio.create_task(audio_cleanup_loop());yield;worker_task.cancel();cleanup_task.cancel()
app=FastAPI(title='Talking Cro.ow API',lifespan=lifespan_context)
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173','http://localhost:5175','http://127.0.0.1:5175','http://localhost:8763','http://127.0.0.1:8763',_a,'https://talking-crow.firebaseapp.com'],allow_credentials=_D,allow_methods=['GET','POST','DELETE','OPTIONS'],allow_headers=[_M,'Content-Type','Accept'])
class Gift(BaseModel):name:str;trigger_value:str;script:str
class Settings(BaseModel):tiktok_username:str;base_audio_path:str
tts_queue=_B
async def tts_worker_loop():
	while _D:
		try:
			if tts_queue is _B:await asyncio.sleep(1);continue
			item=await tts_queue.get();username=item[0];text_to_speak=item[1];isDowngraded=item[2]if len(item)>2 else _E;conn=database.get_db_connection();db_settings=conn.execute('SELECT tts_voice, tts_rate, tts_volume FROM settings LIMIT 1').fetchone();conn.close();voice=db_settings[_c]if db_settings else _Q;rate=db_settings[_R]if db_settings else _F;volume=db_settings[_S]if db_settings else _F;filename=await tts_engine.tts_engine.generate_file(text_to_speak,voice=voice,rate=rate,volume=volume);await broadcast_event(LiveEvent(type='priority_audio',username=username,message=text_to_speak,audio_url=f"http://127.0.0.1:8763/api/audio/{filename}",audio_id=filename,isDowngraded=isDowngraded));tts_queue.task_done()
		except Exception as e:print(f"Error en TTS Worker: {e}");await asyncio.sleep(1)
@app.get(_d,dependencies=[Depends(verify_token)])
def get_gifts():conn=database.get_db_connection();gifts=conn.execute('SELECT id, name, trigger_value as value, script FROM gifts').fetchall();conn.close();return[{_J:g[_J],_T:g[_T],_U:g[_U],_V:g[_V]}for g in gifts]
@app.post(_d,dependencies=[Depends(verify_token)])
def add_gift(gift):conn=database.get_db_connection();c=conn.cursor();c.execute('INSERT INTO gifts (name, trigger_value, script) VALUES (?, ?, ?)',(gift.name,gift.trigger_value,gift.script));conn.commit();new_id=c.lastrowid;conn.close();return{_J:new_id,_T:gift.name,_U:gift.trigger_value,_V:gift.script}
@app.delete('/api/gifts/{gift_id}',dependencies=[Depends(verify_token)])
def delete_gift(gift_id):conn=database.get_db_connection();conn.execute('DELETE FROM gifts WHERE id = ?',(gift_id,));conn.commit();conn.close();return{_A:_C}
class Settings(BaseModel):tiktok_username:str;base_audio_path:str;tts_voice:str=_Q;tts_rate:str=_F;tts_volume:str=_F;tts_read_username:int=1;tts_delay:int=1
@app.get(_f,dependencies=[Depends(verify_token)])
def get_settings():
	conn=database.get_db_connection();settings=conn.execute('SELECT * FROM settings LIMIT 1').fetchone();conn.close()
	if settings:return dict(settings)
	return{'tiktok_username':'','base_audio_path':'',_c:_Q,_R:_F,_S:_F,_e:1,_W:1}
@app.post(_f,dependencies=[Depends(verify_token)])
def update_settings(settings):conn=database.get_db_connection();conn.execute('UPDATE settings SET tiktok_username = ?, base_audio_path = ?, tts_voice = ?, tts_rate = ?, tts_volume = ?, tts_read_username = ?, tts_delay = ?',(settings.tiktok_username,settings.base_audio_path,settings.tts_voice,settings.tts_rate,settings.tts_volume,settings.tts_read_username,settings.tts_delay));conn.commit();conn.close();return{_A:_C}
class PortConfig(BaseModel):port:int
@app.post('/api/config/port',dependencies=[Depends(verify_token)])
def update_port(config):
	try:
		local_config_data[_P]=config.port
		with open(local_config_path,'w')as f:json.dump(local_config_data,f,indent=4)
		return{_A:_C,_H:'Puerto actualizado. Reinicia la aplicación para aplicar los cambios.'}
	except Exception as e:raise HTTPException(status_code=500,detail=str(e))
class TikTokConnectRequest(BaseModel):username:str
active_tiktok_client=_B
tiktok_task=_B
@app.post('/api/tiktok/connect',dependencies=[Depends(verify_token)])
async def connect_tiktok(req):
	G='zorra';F='puta';E='verga';D='puto';A='session_id';C='url_list';B='@';global active_tiktok_client,tiktok_task,live_start_time
	if active_tiktok_client:
		try:await active_tiktok_client.disconnect()
		except:pass
		active_tiktok_client=_B
	try:
		try:print('[Sistema] Solicitando clave de firma segura a Web API...');stream_key=config_data.get('stream_key','');WebDefaults.sign_api_key=stream_key;print('[Sistema] Clave de firma obtenida de la nube exitosamente.')
		except Exception as e:print(f"[Sistema WARNING] Fallo obteniendo llave segura: {e}")
		session_id=config_data.get(A,'')
		if session_id:print('[Sistema] Inyectando Session ID local para evadir bloqueo Anti-Bot...');client=TikTokLiveClient(unique_id=req.username,web_kwargs={A:session_id})
		else:client=TikTokLiveClient(unique_id=req.username)
		active_tiktok_client=client
		async def get_tiktok_avatar(unique_id):0
		import time;live_start_time=0
		@client.on(ConnectEvent)
		async def on_connect(event):global live_start_time;live_start_time=time.time();print(f"[TikTok] Conectado exitosamente. Start time: {live_start_time}")
		@client.on(DisconnectEvent)
		async def on_disconnect(event):
			global live_start_time;print('[TikTok] Conexión cerrada.')
			if live_start_time>0:
				elapsed=time.time()-live_start_time;print(f"[TikTok] Duración del directo: {elapsed} segundos.")
				if elapsed>=2400:print('[TikTok] +40 mins alcanzados. Enviando señal de validación al frontend.');await broadcast_event(LiveEvent(type='system_action',action='register_stream_day',message='Día válido de transmisión'))
				live_start_time=0
			await broadcast_event(LiveEvent(type=_N,username=_G,message=_g))
		import re,unicodedata
		def is_valid_and_clean_message(text):
			C='\\1\\1';A='(.)\\1{2,}'
			if not text:return''
			text=re.sub('\\[.*?\\]','',text);text_cleaned=''.join(c for c in text if unicodedata.category(c).startswith(('L','N','P','Z'))or unicodedata.category(c)in('Sm','Sc','Sk'));text_cleaned=text_cleaned.strip()
			if len(text_cleaned)<2:return''
			leet_map={'4':'a','3':'e','1':'i','0':'o','5':'s',B:'a'};text_leet=''.join(leet_map.get(c,c)for c in text_cleaned.lower());text_reduced=re.sub(A,C,text_leet);blacklist=['gaver',D,'pendej','mierd','perra',E,'vrga','mrd',F,'cabron','cabr0n',G,'marica']
			for word in blacklist:
				if word in text_reduced:return''
			final_text=re.sub(A,C,text_cleaned);return final_text
		@client.on(CommentEvent)
		async def on_comment(event):
			B='display_id';A='unique_id';clean_msg=is_valid_and_clean_message(event.comment);clean_uname=is_valid_and_clean_message(event.user.nickname)or _h;await broadcast_event(LiveEvent(type='chat',username=event.user.nickname,uniqueId=getattr(event.user,A,getattr(event.user,B,getattr(event.user,_X,event.user.nickname))),message=event.comment,clean_username=clean_uname,clean_message=clean_msg));eco_match=re.match('^!?eco[,.]?\\s*(.*)',event.comment,re.IGNORECASE)
			if eco_match:
				eco_message=eco_match.group(1).strip()
				if eco_message:await broadcast_event(LiveEvent(type='eco_command',username=event.user.nickname,uniqueId=getattr(event.user,A,getattr(event.user,B,getattr(event.user,_X,event.user.nickname))),message=eco_message,avatar=getattr(event.user,'avatar_url',_B)))
				return
			if len(event.comment)>250:return
			bad_words=[D,'pendejo',E,'mierda','nigger','nigga','chinga',G,F]
			if any(bw in event.comment.lower()for bw in bad_words):return
			global tts_global_enabled,tts_queue,tts_required_gift,tts_allowed_users
			if tts_global_enabled and tts_queue is not _B:
				clean_msg=is_valid_and_clean_message(event.comment)
				if clean_msg:
					conn=database.get_db_connection();db_settings=conn.execute('SELECT tts_read_username, tts_delay FROM settings LIMIT 1').fetchone();conn.close();read_user=db_settings[_e]if db_settings else 1;delay=db_settings[_W]if db_settings and _W in db_settings.keys()else 1
					if read_user==1:text_to_speak=f"{clean_uname} dice: {clean_msg}"
					else:text_to_speak=clean_msg
					if tts_required_gift==_K:await tts_queue.put((event.user.nickname,text_to_speak))
					elif event.user.nickname in tts_allowed_users:await tts_queue.put((event.user.nickname,text_to_speak));tts_allowed_users.discard(event.user.nickname)
				else:print(f"[Filtro] Mensaje silenciado (Basura/Profanidad): {event.comment}")
		@client.on(GiftEvent)
		async def on_gift(event):
			try:
				img_url=_B
				try:
					if hasattr(event.gift,'image')and hasattr(event.gift.image,C)and len(event.gift.image.url_list)>0:img_url=event.gift.image.url_list[0]
					elif hasattr(event.gift,'icon')and hasattr(event.gift.icon,C)and len(event.gift.icon.url_list)>0:img_url=event.gift.icon.url_list[0]
				except:pass
				should_broadcast=_E;count=1;msg=''
				if getattr(event.gift,'streakable',_E):
					if not getattr(event,'streaking',_E):count=getattr(event,'repeat_count',1);msg=f"{count}x {event.gift.name}";should_broadcast=_D
				else:msg=f"1x {event.gift.name}";should_broadcast=_D
				if should_broadcast:
					await broadcast_event(LiveEvent(type='gift',username=event.user.nickname,message=msg,img_url=img_url));global tts_required_gift,tts_allowed_users
					if tts_required_gift!=_K and event.gift.name.lower()==tts_required_gift.lower():tts_allowed_users.add(event.user.nickname)
			except Exception as e:print('Gift parse error:',e)
		async def run_client_safe():
			A='room_info'
			try:
				await client.start();await broadcast_event(LiveEvent(type=_N,username=_G,message=f"Conectado a la sala de @{req.username}"))
				try:
					avatar=_B
					if hasattr(client,A)and isinstance(client.room_info,dict):
						url_list=client.room_info.get('owner',{}).get('avatar_thumb',{}).get(C,[])
						if url_list and len(url_list)>0:avatar=url_list[0];print(f"[Sistema] Avatar obtenido de room_info: {avatar}")
					if not avatar:avatar=await get_tiktok_avatar(req.username)
					if not avatar and hasattr(client,'get_avatar_url'):avatar=await client.get_avatar_url(req.username)
					if avatar:await broadcast_event(LiveEvent(type=A,username=_G,message=avatar))
					else:clean_username=req.username.strip(B);fallback_avatar=f"https://ui-avatars.com/api/?name={clean_username}&background=random&color=fff&size=128&bold=true";await broadcast_event(LiveEvent(type=A,username=_G,message=fallback_avatar))
				except Exception as e:print(f"[Sistema WARNING] Error al obtener avatar: {e}");clean_username=req.username.strip(B);fallback_avatar=f"https://ui-avatars.com/api/?name={clean_username}&background=random&color=fff&size=128&bold=true";await broadcast_event(LiveEvent(type=A,username=_G,message=fallback_avatar))
			except Exception as e:print(f"[TikTok] Error conectando a {req.username}: {e}");await broadcast_event(LiveEvent(type=A,username=_G,message=_B));await broadcast_event(LiveEvent(type=_N,username=_G,message=f"Error: {e}"));global active_tiktok_client;active_tiktok_client=_B
		tiktok_task=asyncio.create_task(run_client_safe());return{_A:'conectando',_L:req.username}
	except Exception as e:return{_A:_O,_H:str(e)}
@app.post('/api/tiktok/disconnect',dependencies=[Depends(verify_token)])
async def disconnect_tiktok():
	global active_tiktok_client
	if active_tiktok_client:
		try:await active_tiktok_client.disconnect()
		except:pass
		active_tiktok_client=_B;await broadcast_event(LiveEvent(type=_N,username=_G,message=_g))
	return{_A:'desconectado'}
tts_global_enabled=_E
tts_required_gift=_K
tts_allowed_users=set()
class TTSState(BaseModel):enabled:bool;required_gift:Optional[str]=_K
@app.get(_k,dependencies=[Depends(verify_token)])
def get_tts_state():return{_i:tts_global_enabled,_j:tts_required_gift}
@app.post(_k,dependencies=[Depends(verify_token)])
def set_tts_state(state):global tts_global_enabled,tts_required_gift;tts_global_enabled=state.enabled;tts_required_gift=state.required_gift if state.required_gift else _K;return{_A:_C,_i:tts_global_enabled,_j:tts_required_gift}
class TTSTestRequest(BaseModel):text:str;voice:str
@app.post('/api/tts/test',dependencies=[Depends(verify_token)])
async def test_tts(req):conn=database.get_db_connection();db_settings=conn.execute('SELECT tts_rate, tts_volume FROM settings LIMIT 1').fetchone();conn.close();rate=db_settings[_R]if db_settings else _F;volume=db_settings[_S]if db_settings else _F;import tts_engine,os;filename=await tts_engine.tts_engine.generate_file(req.text,voice=req.voice,rate=rate,volume=volume);return{_A:_C,_l:f"/api/audio/{os.path.basename(filename)}"}
from fastapi.responses import FileResponse
@app.get(_n)
async def get_audio(filename):
	safe_filename=os.path.basename(filename);audio_path=os.path.join(get_data_dir(),_m,safe_filename)
	if os.path.exists(audio_path):media='audio/mpeg'if safe_filename.endswith('.mp3')else'audio/wav';return FileResponse(audio_path,media_type=media)
	return{_A:_O,_H:'File not found'}
@app.delete(_n,dependencies=[Depends(verify_token)])
async def delete_audio(filename):
	safe_filename=os.path.basename(filename);audio_path=os.path.join(get_data_dir(),_m,safe_filename)
	if os.path.exists(audio_path):
		try:os.remove(audio_path);return{_A:_C}
		except:return{_A:_O}
	return{_A:_C}
frontend_dist=os.path.join(os.path.dirname(get_base_dir()),'frontend','dist')
pending_comments={}
class TextDonation(BaseModel):username:str;comment:str;audio_id:Optional[str]=_B
@app.post('/api/moderation/text_queue',dependencies=[Depends(verify_token)])
def queue_text_donation(donation):token=str(uuid.uuid4());pending_comments[token]={_J:token,_L:donation.username,_o:donation.comment,_p:donation.audio_id,_A:_q};return{_A:_C,_J:token}
@app.get('/api/moderation/queue',dependencies=[Depends(verify_token)])
def get_moderation_queue():items=[v for v in pending_comments.values()if v[_A]==_q];return{'items':items}
@app.post('/api/moderation/approve/{token}',dependencies=[Depends(verify_token)])
async def approve_text(token):
	if token in pending_comments:
		donation=pending_comments[token];donation[_A]='approved';text_to_speak=f"{donation[_L]} dice: {donation[_o]}";global tts_queue
		if tts_queue is not _B:asyncio.create_task(tts_queue.put((donation[_L],text_to_speak)))
		return{_A:_C,_H:'Enviado a síntesis'}
	return{_A:_O,_H:'No encontrado'}
@app.post('/api/moderation/reject/{token}',dependencies=[Depends(verify_token)])
def reject_text(token):
	if token in pending_comments:pending_comments[token][_A]='rejected'
	return{_A:_C}
class TTSFallbackRequest(BaseModel):username:str;message:str
@app.post('/api/tts/fallback',dependencies=[Depends(verify_token)])
async def trigger_tts_fallback(req):
	global tts_queue;clean_msg=is_valid_and_clean_message(req.message);clean_uname=is_valid_and_clean_message(req.username)or _h
	if clean_msg:text_to_speak=f"{clean_uname} dice: {clean_msg}";await tts_queue.put((req.username,text_to_speak,_D))
	return{_A:_C}
@app.post('/api/shutdown')
async def shutdown(request):
	auth_header=request.headers.get(_M);local_key=local_config_data.get(_I)
	if not local_key or auth_header!=f"Bearer {local_key}":raise HTTPException(status_code=403,detail='No autorizado para apagar')
	print('[Backend] Recibida señal de apagado. Terminando procesos...');global active_tiktok_client
	if active_tiktok_client:
		try:asyncio.create_task(active_tiktok_client.disconnect())
		except:pass
	kill_script=os.path.join(os.path.dirname(get_base_dir()),'kill_all.bat')
	if os.path.exists(kill_script):subprocess.Popen(['cmd.exe','/c',kill_script],creationflags=subprocess.CREATE_NEW_CONSOLE|134217728)
	import threading;threading.Timer(1.,lambda:os._exit(0)).start();return{_A:'shutting_down'}
from fastapi.responses import StreamingResponse
sse_clients=[]
@app.get('/api/live_events')
async def sse_live_events(token=Depends(verify_token_query)):
	queue=asyncio.Queue();sse_clients.append(queue)
	async def event_stream():
		try:
			while _D:data=await queue.get();yield f"data: {json.dumps(data)}\n\n"
		except asyncio.CancelledError:pass
		finally:
			if queue in sse_clients:sse_clients.remove(queue)
	return StreamingResponse(event_stream(),media_type='text/event-stream')
class LiveEvent(BaseModel):type:str;username:str;uniqueId:Optional[str]=_B;message:Optional[str]=_B;clean_username:str='';clean_message:str='';img_url:Optional[str]=_B;audio_url:Optional[str]=_B;audio_id:Optional[str]=_B;isDowngraded:Optional[bool]=_E
@app.post('/api/internal/broadcast',dependencies=[Depends(verify_token)])
async def broadcast_event(event):
	for q in sse_clients:await q.put({'type':event.type,_L:event.username,_X:event.uniqueId,_H:event.message,'clean_username':event.clean_username,'clean_message':event.clean_message,'img_url':event.img_url,_l:event.audio_url,_p:event.audio_id,'isDowngraded':event.isDowngraded})
	return{_A:_C}
@app.get('/{full_path:path}')
async def serve_frontend(full_path):
	if full_path.startswith('api/'):raise HTTPException(status_code=404,detail='API route not found')
	safe_dist=os.path.abspath(frontend_dist);requested_path=os.path.abspath(os.path.join(frontend_dist,full_path))
	if not requested_path.startswith(safe_dist):raise HTTPException(status_code=403,detail='Forbidden: Path Traversal attempt')
	if os.path.exists(requested_path)and os.path.isfile(requested_path):return FileResponse(requested_path)
	index_path=os.path.join(frontend_dist,'index.html')
	if os.path.exists(index_path):return FileResponse(index_path)
	return{_H:'Talking Cro.ow Backend is running. Please build the frontend.'}
if __name__=='__main__':
	import uvicorn;config_path=os.path.join(get_data_dir(),_Z);port=8763
	if os.path.exists(config_path):
		try:
			with open(config_path,'r')as f:cfg=json.load(f);port=cfg.get(_P,port)
		except Exception as e:print('Error leyendo config.json:',e)
	print(f"Iniciando Servidor Unificado de Talking Cro.ow en el puerto: {port}");uvicorn.run(app,host='127.0.0.1',port=port)