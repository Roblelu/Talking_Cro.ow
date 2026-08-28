/**
 * ============================================================================
 * ARCHIVO: Selección del dominio auxiliar de Firebase Authentication
 * ÁREA: Autenticación web
 *
 * PROPÓSITO:
 * Mantener el iframe y el callback OAuth en el mismo origen que entrega la SPA.
 * Los navegadores modernos bloquean el almacenamiento de terceros que Firebase
 * necesita cuando `signInWithRedirect` usa un `authDomain` de otro origen.
 *
 * PRECAUCIÓN DE MANTENIMIENTO:
 * Cada dominio añadido aquí también debe estar autorizado en Firebase Auth y su
 * URI `https://<dominio>/__/auth/handler` debe existir en el proveedor Google.
 * ============================================================================
 */

export const DEFAULT_FIREBASE_AUTH_DOMAIN = "talking-crow.firebaseapp.com";

const SAME_ORIGIN_AUTH_DOMAINS = new Set([
  "talkingcroow.com",
  "talking-crow.web.app"
]);

/**
 * Selecciona el authDomain seguro para el host actual.
 *
 * En Firebase Hosting se usa el mismo host de la SPA. En desarrollo local se
 * conserva firebaseapp.com porque localhost no publica `/__/auth/handler`.
 *
 * @param {string} hostname Host sin protocolo ni puerto.
 * @returns {string} Dominio que Firebase Auth usará para popup y redirect.
 */
export function resolveFirebaseAuthDomain(hostname) {
  const normalizedHost = String(hostname || "").trim().toLowerCase();
  return SAME_ORIGIN_AUTH_DOMAINS.has(normalizedHost)
    ? normalizedHost
    : DEFAULT_FIREBASE_AUTH_DOMAIN;
}

