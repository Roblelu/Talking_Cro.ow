// Exchange the private resource key for a short-lived token; never return the key.
function createBaseVoiceHandler({ db, axios, HttpsError, getKey }) {
  let cached;
  let pending;
  return async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Inicia sesión para utilizar las voces.');
    const user = await db.collection('users').doc(request.auth.uid).get();
    if (!user.exists || !(user.data().creator_credits > 0 || user.data().isAdmin === true)) {
      throw new HttpsError('permission-denied', 'Necesitas créditos para utilizar las voces.');
    }
    if (cached && cached.expiresAt > Date.now() + 60000) return { ...cached, expiresIn: Math.floor((cached.expiresAt - Date.now()) / 1000) };
    if (!pending) {
      pending = (async () => {
        const key = getKey();
        if (!key) throw new Error('Missing configuration');
        const response = await axios.post('https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken', null, {
          headers: { 'Ocp-Apim-Subscription-Key': key }, timeout: 15000, responseType: 'text',
        });
        if (typeof response.data !== 'string' || !response.data.length) throw new Error('Invalid response');
        cached = { token: response.data, region: 'eastus', expiresAt: Date.now() + 540000 };
        return { ...cached, expiresIn: 540 };
      })().finally(() => { pending = null; });
    }
    try { return await pending; }
    catch { throw new HttpsError('unavailable', 'No se pudo autorizar la voz. Inténtalo más tarde.'); }
  };
}
module.exports = { createBaseVoiceHandler };
