import sys

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """function ObsOverlay() {
    const [media, setMedia] = React.useState(null);
    React.useEffect(() => {
        const channel = new BroadcastChannel('obs-overlay');
        channel.onmessage = (e) => {
            const { type, url, volume } = e.data;
            if (type === 'sound') {
                const audio = new Audio(url);
                audio.volume = volume || 1;
                audio.play().catch(e => console.error("Audio play error", e));
            } else if (type === 'sticker') {
                setMedia(url);
                setTimeout(() => setMedia(null), 5000);
            }
        };
        return () => channel.close();
    }, []);"""

replace1 = """function ObsOverlay() {
    const [media, setMedia] = React.useState(null);
    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('http://127.0.0.1:8763/api/overlay/pop');
                const data = await res.json();
                if (data.events && data.events.length > 0) {
                    data.events.forEach(event => {
                        const { type, url, volume } = event;
                        if (type === 'sound') {
                            const audio = new Audio(url);
                            audio.volume = volume || 1;
                            audio.play().catch(e => console.error("Audio play error", e));
                        } else if (type === 'sticker') {
                            setMedia(url);
                            setTimeout(() => setMedia(null), 5000);
                        }
                    });
                }
            } catch (e) {
                console.error("Overlay fetch error", e);
            }
        };
        const interval = setInterval(fetchEvents, 300);
        return () => clearInterval(interval);
    }, []);"""

target2 = """  const obsChannel = React.useMemo(() => new BroadcastChannel('obs-overlay'), []);
  const handlePlayMedia = (type, item, volume) => {
      let url = item.url;
      if (!url) {
          const name = item.name.toLowerCase().trim();
          if (type === 'sound') {
              const key = Object.keys(defaultSoundsData).find(k => k.toLowerCase() === name);
              if (key) url = defaultSoundsData[key];
          } else {
              const key = Object.keys(defaultStickersData).find(k => k.toLowerCase() === name);
              if (key) url = defaultStickersData[key];
          }
      }
      
      if (!url) {
          alert(`El ítem "${item.name}" no tiene archivo asociado. Por favor elimínalo y vuelve a crearlo.`);
          return;
      }
      
      obsChannel.postMessage({ type, url: url, volume: volume / 100 });
  };"""

replace2 = """  const handlePlayMedia = async (type, item, volume) => {
      let url = item.url;
      if (!url) {
          const name = item.name.toLowerCase().trim();
          if (type === 'sound') {
              const key = Object.keys(defaultSoundsData).find(k => k.toLowerCase() === name);
              if (key) url = defaultSoundsData[key];
          } else {
              const key = Object.keys(defaultStickersData).find(k => k.toLowerCase() === name);
              if (key) url = defaultStickersData[key];
          }
      }
      
      if (!url) {
          alert(`El ítem "${item.name}" no tiene archivo asociado. Por favor elimínalo y vuelve a crearlo.`);
          return;
      }
      
      try {
          await fetch('http://127.0.0.1:8763/api/overlay/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, url, volume: volume / 100 })
          });
      } catch (e) {
          console.error("Error enviando a overlay", e);
      }
  };"""

content = content.replace(target1, replace1)
content = content.replace(target2, replace2)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Frontend patched!")
