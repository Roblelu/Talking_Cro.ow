import json
import glob
import os

for f in glob.glob('C:/Users/cnkrx/.gemini/antigravity/brain/*/.system_generated/logs/transcript.jsonl'):
    try:
        for line in open(f, 'r', encoding='utf-8'):
            if 'emoji' in line.lower() and 'tts' in line.lower():
                data = json.loads(line)
                content = data.get('content', '')
                if content:
                    print(content[:200])
                    print("---")
    except Exception as e:
        pass
