import json
import glob
import os

for f in glob.glob('C:/Users/cnkrx/.gemini/antigravity/brain/*/.system_generated/logs/transcript.jsonl'):
    try:
        for line in open(f, 'r', encoding='utf-8'):
            if 'emoji' in line.lower() or 'dorado' in line.lower() or 'integrado' in line.lower():
                data = json.loads(line)
                content = data.get('content', '')
                if content and ('emoji' in content.lower() or 'dorado' in content.lower() or 'integrado' in content.lower()):
                    print("Found in", os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(f)))))
                    print(content[:300])
                    print("-" * 50)
    except Exception as e:
        print("Error reading", f, e)
