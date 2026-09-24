/** Keeps temporary voice lifecycle shared by chat and profile previews. */
function createEcoSynthesizer({ axios, FormData, getStorage, getApiKey, logger }) {
  return async function synthesizeEcoVoice({ uid, voiceId, extension, text }) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('Servicio de voces no configurado.');
    let temporaryVoiceId;
    try {
      if (!voiceId) {
        if (!uid || !/^\.(mp3|wav|m4a|mp4|aac|webm|ogg)$/.test(extension || '')) {
          throw new Error('No hay una grabación de voz válida.');
        }
        const [sample] = await getStorage().bucket().file(`eco_voices/${uid}/voice_sample${extension}`).download();
        const form = new FormData();
        form.append('name', `Eco_${uid.substring(0, 8)}`);
        form.append('files', sample, { filename: `voice_sample${extension}` });
        const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
          headers: { ...form.getHeaders(), 'xi-api-key': apiKey }, timeout: 25000,
        });
        temporaryVoiceId = response.data.voice_id;
        if (!temporaryVoiceId || response.data.requires_verification) {
          throw new Error('La grabación requiere validación antes de poder utilizarse.');
        }
        voiceId = temporaryVoiceId;
      }
      const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        text, model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }, {
        headers: { Accept: 'audio/mpeg', 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer', timeout: 35000,
      });
      const contentType = response.headers?.['content-type'];
      if (contentType && !contentType.startsWith('audio/')) throw new Error('La respuesta no contiene audio válido.');
      const audio = Buffer.from(response.data);
      if (!audio.length || audio.length > 650000) throw new Error('No se pudo preparar el audio de voz.');
      return audio.toString('base64');
    } finally {
      // Await cleanup so the function cannot freeze with a deletion still pending.
      if (temporaryVoiceId) {
        try {
          await axios.delete(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(temporaryVoiceId)}`, {
            headers: { 'xi-api-key': apiKey }, timeout: 5000,
          });
        } catch (error) { logger.warn('No se pudo limpiar una voz temporal.', { status: error.response?.status }); }
      }
    }
  };
}
module.exports = { createEcoSynthesizer };
