"""Voice selection must be applied before the Azure SDK snapshots its config."""
import importlib.util
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('tts_voice_under_test', ROOT / 'tts_engine.py')
engine = importlib.util.module_from_spec(spec)
# Keep module discovery isolated from the startup tests and real user data.
with patch.dict(sys.modules, {'runtime_paths': SimpleNamespace(get_data_dir=lambda: str(ROOT))}):
    spec.loader.exec_module(engine)
VOICES = ('es-MX-DaliaNeural', 'es-MX-JorgeNeural', 'es-ES-ElviraNeural', 'es-ES-AlvaroNeural')


class VoiceSelectionTests(unittest.TestCase):
    def synthesize(self, voice, rate, volume):
        engine.set_voice_session('test-token', 'eastus', 540)
        captured = {}
        config = SimpleNamespace(set_speech_synthesis_output_format=lambda value: None)
        result = SimpleNamespace(reason=engine.speechsdk.ResultReason.SynthesizingAudioCompleted)
        future = SimpleNamespace(get=lambda: result)

        def construct(speech_config, audio_config):
            # Copy now, as the real SDK does; later config mutations must not pass.
            captured['voice'] = getattr(speech_config, 'speech_synthesis_voice_name', None)
            captured['locale'] = getattr(speech_config, 'speech_synthesis_language', None)
            def text(value):
                captured['text'] = value
                return future
            def ssml(value):
                captured['ssml'] = value
                return future
            return SimpleNamespace(speak_text_async=text, speak_ssml_async=ssml)

        with patch.object(engine.speechsdk, 'SpeechConfig', return_value=config), \
             patch.object(engine.speechsdk.audio, 'AudioOutputConfig'), \
             patch.object(engine.speechsdk, 'SpeechSynthesizer', side_effect=construct):
            self.assertTrue(engine._synthesize_sync('Hola <España> & México', 'unused.mp3', voice, rate, volume))
        return captured

    def test_all_four_voices_with_default_rate_and_volume(self):
        for voice in VOICES:
            with self.subTest(voice=voice):
                captured = self.synthesize(voice, '+0%', '+0%')
                self.assertEqual(captured['voice'], voice)
                self.assertEqual(captured['locale'], voice[:5])
                self.assertEqual(captured['text'], 'Hola <España> & México')

    def test_all_four_voices_with_custom_rate_and_volume(self):
        ns = {'s': 'http://www.w3.org/2001/10/synthesis'}
        for voice in VOICES:
            with self.subTest(voice=voice):
                captured = self.synthesize(voice, '+15%', '-10%')
                self.assertEqual(captured['voice'], voice)
                root = ET.fromstring(captured['ssml'])
                self.assertEqual(root.attrib['{http://www.w3.org/XML/1998/namespace}lang'], voice[:5])
                self.assertEqual(root.find('s:voice', ns).attrib['name'], voice)
                prosody = root.find('s:voice/s:prosody', ns)
                self.assertEqual(prosody.attrib, {'rate': '+15%', 'volume': '-10%'})
                self.assertEqual(prosody.text.strip(), 'Hola <España> & México')


if __name__ == '__main__':
    unittest.main()
