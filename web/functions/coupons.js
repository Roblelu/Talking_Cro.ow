const { randomBytes } = require('node:crypto');

/** Both currencies share redemption rules, never their balance fields. */
function createCouponHandlers({ db, HttpsError, FieldValue, Timestamp }) {
  const validAmount = value => Number.isSafeInteger(value) && value > 0 && value <= 1000000;
  async function generateCoupons(request) {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Acceso denegado.');
    const admin = await db.collection('users').doc(request.auth.uid).get();
    if (!admin.exists || admin.data().isAdmin !== true) throw new HttpsError('permission-denied', 'No eres superusuario.');
    const input = request.data || {};
    const plans = [{ currency: 'croins', amounts: { multi: 48, large: 96, small: 24 } }];
    // Older clients still receive the original Croins-only batch.
    if (input.includeCredits === true) {
      const amounts = { multi: 48, large: 96, small: 24 };
      plans.push({ currency: 'credits', amounts });
    }
    const batch = db.batch();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 86400000));
    const coupons = [];
    for (const { currency, amounts } of plans) {
      for (const [kind, count, type] of [['multi', 1, 'multi'], ['large', 25, 'single'], ['small', 50, 'single']]) {
        for (let i = 0; i < count; i++) {
          const code = `${currency === 'credits' ? 'CR' : 'TC'}-${randomBytes(8).toString('hex').toUpperCase()}`;
          // create (not set) ensures a collision can never replace an existing coupon.
          batch.create(db.collection('coupons').doc(code), {
            currency, type, amount: amounts[kind], redeemed: false,
            ...(type === 'multi' ? { maxUses: 25, usedBy: [] } : {}),
            createdBy: request.auth.uid, createdAt: FieldValue.serverTimestamp(), expiresAt,
          });
          coupons.push({ code, currency, amount: amounts[kind], type: type === 'multi' ? 'MULTI (25 usos)' : 'Único' });
        }
      }
    }
    await batch.commit();
    return { success: true, coupons };
  }

  async function redeemCoupon(request) {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para canjear un cupón.');
    const code = typeof request.data?.code === 'string' ? request.data.code.trim().toUpperCase() : '';
    if (!/^[A-Z0-9-]{1,64}$/.test(code)) throw new HttpsError('invalid-argument', 'Código inválido.');
    return db.runTransaction(async t => {
      const couponRef = db.collection('coupons').doc(code);
      const userRef = db.collection('users').doc(request.auth.uid);
      const coupon = await t.get(couponRef);
      if (!coupon.exists) throw new HttpsError('not-found', 'Cupón no encontrado o inválido.');
      const user = await t.get(userRef);
      if (!user.exists) throw new HttpsError('not-found', 'Primero completa el registro de tu cuenta.');
      const data = coupon.data();
      // Legacy coupons have no currency and always awarded promotional Croins.
      const currency = data.currency === undefined ? 'croins' : data.currency;
      if (!['croins', 'credits'].includes(currency) || !validAmount(data.amount) || !['multi', 'single'].includes(data.type)) {
        throw new HttpsError('failed-precondition', 'El cupón no tiene una configuración válida.');
      }
      if (data.expiresAt && data.expiresAt.toDate().getTime() <= Date.now()) throw new HttpsError('failed-precondition', 'Este cupón ha expirado.');
      if (data.type === 'multi') {
        const usedBy = data.usedBy || [];
        const maxUses = data.maxUses || 25;
        if (!Array.isArray(usedBy) || !Number.isSafeInteger(maxUses) || maxUses < 1) throw new HttpsError('failed-precondition', 'Cupón inválido.');
        if (usedBy.includes(request.auth.uid)) throw new HttpsError('failed-precondition', 'Ya has canjeado este cupón especial.');
        if (data.redeemed || usedBy.length >= maxUses) throw new HttpsError('failed-precondition', 'El límite de usos de este cupón se ha agotado.');
        t.update(couponRef, { usedBy: FieldValue.arrayUnion(request.auth.uid), redeemed: usedBy.length + 1 >= maxUses });
      } else {
        if (data.redeemed) throw new HttpsError('failed-precondition', 'Este cupón ya ha sido canjeado.');
        t.update(couponRef, { redeemed: true, redeemedBy: request.auth.uid, redeemedAt: FieldValue.serverTimestamp() });
      }
      t.update(userRef, { [currency === 'credits' ? 'creator_credits' : 'promotional_croins']: FieldValue.increment(data.amount) });
      t.set(userRef.collection('transactions').doc(`coupon_${code}`), {
        type: 'coupon_redemption', currency, amount: data.amount, status: 'succeeded',
        description: `Cupón de ${currency === 'credits' ? 'créditos' : 'Croins promocionales'}`,
        date: FieldValue.serverTimestamp(), couponCode: code,
      });
      return { success: true, amount: data.amount, currency };
    });
  }
  return { generateCoupons, redeemCoupon };
}
module.exports = { createCouponHandlers };
