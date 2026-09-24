// Only product language may cross into user-visible error messages.
export function ecoErrorMessage(error) {
  const code = String(error?.code || '').replace('functions/', '');
  return ({
    unauthenticated: 'Inicia sesión de nuevo para utilizar las voces Eco.',
    'not-found': 'El autor del mensaje debe registrar su cuenta de TikTok para utilizar su voz Eco.',
    'failed-precondition': 'No se pudo usar la voz Eco. Revisa la grabación, el saldo y la disponibilidad del servicio.',
    'invalid-argument': 'El mensaje Eco no es válido o supera el tamaño permitido.',
    'resource-exhausted': 'El servicio de voces Eco está ocupado. Inténtalo más tarde.',
  })[code] || 'No se pudo procesar la voz Eco. Inténtalo de nuevo más tarde.';
}

export function parseEcoRequest(data, requestId, requestRef) {
  if (data.censored || data.audioBase64 === 'CENSORED') return { censored: true };
  if (typeof data.audioBase64 !== 'string' || !data.audioBase64 ||
      data.audioBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.audioBase64)) {
    throw new Error('No se pudo leer el audio Eco recibido.');
  }
  return {
    type: 'priority_audio', username: data.tiktok_username, message: data.message || '',
    audio_url: `data:audio/mpeg;base64,${data.audioBase64}`, isEcoVoice: true,
    timestamp: new Date(), id: requestId, ecoRequestRef: requestRef,
  };
}
