"""Regression checks without live TikTok calls or access to real user data."""
import contextlib
import importlib
import io
import json
import os
from pathlib import Path
import shutil
import sqlite3
import sys
import tempfile
import unittest


class DesktopStartupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.source = Path(cls.temp.name) / 'backend'
        cls.target = Path(cls.temp.name) / 'userdata'
        cls.source.mkdir()
        cls.target.mkdir()
        root = Path(__file__).resolve().parents[1]
        for name in ('app.py', 'database.py', 'tts_engine.py', 'runtime_paths.py'):
            shutil.copy2(root / name, cls.source / name)
        (cls.source / 'local_config.json').write_text(json.dumps({'api_key': 'old-test-key'}))
        (cls.target / 'local_config.json').write_text(json.dumps({'api_key': 'shared-test-key'}))
        (cls.source / 'config.json').write_text(json.dumps({'port': 8763}))
        with contextlib.closing(sqlite3.connect(cls.source / 'database.db')) as db:
            db.execute('CREATE TABLE preserved (value TEXT)')
            db.execute("INSERT INTO preserved VALUES ('existing-data')")
            db.commit()
        cls.previous = os.environ.get('TALKING_CROW_DATA_DIR')
        os.environ['TALKING_CROW_DATA_DIR'] = str(cls.target)
        sys.path.insert(0, str(cls.source))
        with contextlib.redirect_stdout(io.StringIO()):
            cls.module = importlib.import_module('app')
        from fastapi.testclient import TestClient
        cls.client = TestClient(cls.module.app)
        cls.client.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        if cls.previous is None:
            os.environ.pop('TALKING_CROW_DATA_DIR', None)
        else:
            os.environ['TALKING_CROW_DATA_DIR'] = cls.previous
        sys.path.remove(str(cls.source))
        cls.temp.cleanup()

    def test_shared_credentials_and_rejected_invalid_credentials(self):
        self.assertEqual(self.module.LOCAL_API_KEY, 'shared-test-key')
        self.assertEqual(self.client.get('/api/settings', headers={'Authorization': 'Bearer shared-test-key'}).status_code, 200)
        self.assertEqual(self.client.get('/api/settings', headers={'Authorization': 'Bearer old-test-key'}).status_code, 403)
        self.assertEqual(self.client.get('/api/settings').status_code, 401)

    def test_packaged_http_origin_allowed_without_allowing_null(self):
        for origin, expected in [('http://127.0.0.1:5173', 200), ('null', 400)]:
            response = self.client.options('/api/settings', headers={
                'Origin': origin, 'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'authorization',
            })
            self.assertEqual(response.status_code, expected)

    def test_database_and_audio_share_writable_directory(self):
        self.assertEqual(Path(self.module.get_data_dir()), self.target)
        self.assertEqual(Path(self.module.database.DB_PATH), self.target / 'database.db')
        self.assertEqual(Path(self.module.tts_engine.tts_engine.get_audio_dir()), self.target / 'audio_queue')
        with contextlib.closing(sqlite3.connect(self.module.database.DB_PATH)) as db:
            self.assertEqual(db.execute('SELECT value FROM preserved').fetchone()[0], 'existing-data')
        self.assertTrue((self.source / 'database.db').exists())

    def test_sse_tickets_are_single_use(self):
        import asyncio
        response = self.client.post('/api/ticket', headers={'Authorization': 'Bearer shared-test-key'})
        ticket = response.json()['ticket']
        asyncio.run(self.module.verify_ticket_query(None, ticket))
        with self.assertRaises(self.module.HTTPException) as error:
            asyncio.run(self.module.verify_ticket_query(None, ticket))
        self.assertEqual(error.exception.status_code, 403)

    def test_configured_signing_key_reaches_library(self):
        from TikTokLive.client.web.web_settings import WebDefaults
        from TikTokLive.client.web.web_signer import TikTokSigner
        from unittest.mock import patch
        class FakeClient:
            def __init__(self, **kwargs):
                self.signing_key = TikTokSigner().sign_api_key
            def on(self, event):
                return lambda handler: handler
            async def start(self):
                pass
        self.module.config_data['stream_key'] = 'test-sign-key'
        with patch.dict(os.environ, {'SIGN_API_KEY': ''}), patch.object(self.module, 'TikTokLiveClient', FakeClient):
            response = self.client.post('/api/tiktok/connect', json={'username': 'test-user'}, headers={'Authorization': 'Bearer shared-test-key'})
        self.assertEqual(response.json()['status'], 'conectando')
        self.assertEqual(self.module.active_tiktok_client.signing_key, 'test-sign-key')
        WebDefaults.tiktok_sign_api_key = None
        self.module.active_tiktok_client = None


if __name__ == '__main__':
    unittest.main()
