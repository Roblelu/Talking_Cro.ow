import { updateProfile } from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * ============================================================================
 * ARCHIVO: Flujo canónico de registro con Google
 * ÁREA: Autenticación y creación de perfiles
 *
 * PROPÓSITO:
 * Centralizar la normalización, persistencia temporal y creación transaccional
 * del perfil. Evita que popup, redirect y recuperación evolucionen de forma
 * diferente o dejen una identidad de Firebase Auth sin perfil de Talking Crow.
 *
 * DECISIÓN TÉCNICA:
 * Firestore se escribe mediante una transacción idempotente. Un reintento puede
 * completar un perfil faltante, pero nunca reinicializa saldos de uno existente.
 *
 * EFECTOS SECUNDARIOS:
 * Lee/escribe Firestore, actualiza opcionalmente el displayName de Firebase Auth
 * y usa sessionStorage para sobrevivir a una redirección OAuth.
 * ============================================================================
 */

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+( [a-zA-Z0-9_]+)?$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 18;
const PENDING_REGISTRATION_KEY = "pending_google_registration_v2";
const LEGACY_PENDING_REGISTRATION_KEY = "pending_registration";
const PENDING_REGISTRATION_VERSION = 2;
const PENDING_REGISTRATION_TTL_MS = 15 * 60 * 1000;

export class RegistrationFlowError extends Error {
  /**
   * @param {string} code Código estable que la interfaz puede traducir sin exponer detalles internos.
   * @param {string} [message] Descripción solo para diagnóstico local.
   */
  constructor(code, message = code) {
    super(message);
    this.name = "RegistrationFlowError";
    this.code = code;
  }
}

/**
 * Valida y normaliza el username una sola vez para UI, documento público y
 * reserva global. La variante visible conserva mayúsculas; la reserva no.
 *
 * @param {string} rawUsername Valor introducido por el usuario.
 * @returns {{displayUsername: string, normalizedUsername: string}}
 * @throws {RegistrationFlowError} Cuando el formato no cumple el contrato.
 */
export function validateRegistrationUsername(rawUsername) {
  const displayUsername = String(rawUsername || "").trim();

  if (
    displayUsername.length < USERNAME_MIN_LENGTH ||
    displayUsername.length > USERNAME_MAX_LENGTH ||
    !USERNAME_PATTERN.test(displayUsername)
  ) {
    throw new RegistrationFlowError("INVALID_USERNAME");
  }

  return {
    displayUsername,
    normalizedUsername: displayUsername.toLowerCase()
  };
}

/**
 * Crea los documentos necesarios para una cuenta nueva dentro de una operación
 * atómica. Si el perfil ya existe, termina sin escribir para preservar saldos.
 *
 * @param {import("firebase/firestore").Firestore} firestore Instancia a usar; es inyectable para emuladores.
 * @param {{uid: string, email?: string|null}} user Usuario autenticado por Firebase Auth.
 * @param {string} rawUsername Username visible elegido por el usuario.
 * @returns {Promise<{status: "created"|"already-complete", displayUsername: string}>}
 */
export async function createRegistrationDocuments(firestore, user, rawUsername) {
  if (!user?.uid) {
    throw new RegistrationFlowError("NOT_AUTHENTICATED");
  }

  const { displayUsername, normalizedUsername } = validateRegistrationUsername(rawUsername);
  const userRef = doc(firestore, "users", user.uid);
  const usernameRef = doc(firestore, "usernames", normalizedUsername);
  const privateContactRef = doc(firestore, "users", user.uid, "private", "contact");

  return runTransaction(firestore, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    // Un perfil existente es la autoridad. No se vuelven a aplicar saldos de
    // bienvenida ni se cambia el username durante un reintento de autenticación.
    if (userSnapshot.exists()) {
      return {
        status: "already-complete",
        displayUsername: userSnapshot.data().username || displayUsername
      };
    }

    const usernameSnapshot = await transaction.get(usernameRef);
    if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== user.uid) {
      throw new RegistrationFlowError("USERNAME_TAKEN");
    }

    // Una reserva del mismo UID puede provenir de datos heredados. No se intenta
    // actualizarla porque las reglas permiten crearla, pero no sobrescribirla.
    if (!usernameSnapshot.exists()) {
      transaction.set(usernameRef, { uid: user.uid });
    }

    transaction.set(userRef, {
      purchased_croins: 0,
      promotional_croins: 24,
      creator_credits: 0,
      creator_earnings: 0,
      isPro: false,
      username: displayUsername,
      createdAt: serverTimestamp()
    });

    transaction.set(privateContactRef, {
      email: user.email || "",
      phone: "",
      ai_processing_consent: {
        accepted: true,
        timestamp: serverTimestamp()
      }
    }, { merge: true });

    return { status: "created", displayUsername };
  });
}

/**
 * Ejecuta la creación canónica y actualiza el nombre visible de Firebase Auth.
 * El displayName es decorativo: si falla después de confirmar Firestore, el
 * registro sigue considerándose exitoso para no mentir al usuario ni duplicarlo.
 *
 * @param {{uid: string, email?: string|null, displayName?: string|null}} user Usuario autenticado.
 * @param {string} rawUsername Username visible.
 * @returns {Promise<{status: "created"|"already-complete", displayUsername: string}>}
 */
export async function completeGoogleRegistration(user, rawUsername) {
  const result = await createRegistrationDocuments(db, user, rawUsername);

  if (result.status === "created" && user.displayName !== result.displayUsername) {
    try {
      await updateProfile(user, { displayName: result.displayUsername });
    } catch (error) {
      logAuthFlowError("auth_profile_update", error);
    }
  }

  return result;
}

function getDefaultStorage() {
  return typeof window !== "undefined" ? window.sessionStorage : null;
}

/** Guarda el formulario mínimo requerido para completar el retorno OAuth. */
export function savePendingRegistration({ displayUsername, desktop }, storage = getDefaultStorage()) {
  if (!storage) return;

  const validUsername = validateRegistrationUsername(displayUsername).displayUsername;
  storage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({
    version: PENDING_REGISTRATION_VERSION,
    displayUsername: validUsername,
    consentAccepted: true,
    desktop: Boolean(desktop),
    createdAt: Date.now()
  }));
}

/**
 * Recupera estado vigente. Acepta temporalmente la clave anterior para que una
 * redirección iniciada antes de actualizar la SPA todavía pueda terminar.
 */
export function readPendingRegistration(storage = getDefaultStorage(), now = Date.now()) {
  if (!storage) return null;

  const rawV2 = storage.getItem(PENDING_REGISTRATION_KEY);
  if (rawV2) {
    try {
      const parsed = JSON.parse(rawV2);
      const isFresh = parsed.version === PENDING_REGISTRATION_VERSION &&
        Number.isFinite(parsed.createdAt) &&
        now - parsed.createdAt >= 0 &&
        now - parsed.createdAt <= PENDING_REGISTRATION_TTL_MS;

      if (isFresh && parsed.consentAccepted === true) {
        return {
          displayUsername: validateRegistrationUsername(parsed.displayUsername).displayUsername,
          desktop: Boolean(parsed.desktop)
        };
      }
    } catch {
      // El estado corrupto se descarta abajo y el usuario pasa a recuperación guiada.
    }
    storage.removeItem(PENDING_REGISTRATION_KEY);
  }

  const legacyRaw = storage.getItem(LEGACY_PENDING_REGISTRATION_KEY);
  if (!legacyRaw) return null;

  try {
    const legacy = JSON.parse(legacyRaw);
    return {
      displayUsername: validateRegistrationUsername(legacy.displayUsername).displayUsername,
      // La versión anterior no guardaba el destino. `null` permite que el query
      // string actual decida entre dashboard y el puente de Electron.
      desktop: null
    };
  } catch {
    storage.removeItem(LEGACY_PENDING_REGISTRATION_KEY);
    return null;
  }
}

/** Se invoca exclusivamente después de éxito o cancelación explícita. */
export function clearPendingRegistration(storage = getDefaultStorage()) {
  if (!storage) return;
  storage.removeItem(PENDING_REGISTRATION_KEY);
  storage.removeItem(LEGACY_PENDING_REGISTRATION_KEY);
}

export function isMobileAuthClient(userAgent) {
  return /iPhone|iPad|iPod|Android/i.test(String(userAgent || ""));
}

export function isDesktopAuthRequest(search = "") {
  return new URLSearchParams(search).get("desktop") === "true";
}

export function getPostAuthPath(search = "", desktopOverride = null) {
  const isDesktop = desktopOverride === null
    ? isDesktopAuthRequest(search)
    : Boolean(desktopOverride);
  return isDesktop ? "/auth-desktop" : "/dashboard";
}

export function getRecoveryPath(search = "") {
  const params = new URLSearchParams({ resume: "true" });
  if (isDesktopAuthRequest(search)) params.set("desktop", "true");
  return `/register?${params.toString()}`;
}

/** Traduce errores técnicos a mensajes accionables y estables para el usuario. */
export function getRegistrationErrorMessage(error) {
  switch (error?.code) {
    case "INVALID_USERNAME":
      return "El usuario debe tener de 3 a 18 caracteres, permitir solo un espacio y usar únicamente letras, números o _.";
    case "USERNAME_TAKEN":
      return "El nombre de usuario ya está ocupado. Elige otro.";
    case "NOT_AUTHENTICATED":
      return "La sesión de Google terminó. Vuelve a continuar con Google.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "No fue posible crear el perfil por permisos de la base de datos. Intenta nuevamente y, si continúa, contacta a soporte.";
    case "auth/popup-closed-by-user":
      return "Se cerró la ventana de Google antes de terminar.";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Permite ventanas emergentes e intenta nuevamente.";
    case "auth/network-request-failed":
      return "No se pudo contactar a Google. Revisa tu conexión e intenta nuevamente.";
    case "auth/web-storage-unsupported":
      return "El navegador está bloqueando el almacenamiento necesario para iniciar sesión.";
    case "auth/unauthorized-domain":
      return "Este dominio todavía no está autorizado para iniciar sesión con Google.";
    default:
      return "No fue posible completar el acceso con Google. Intenta nuevamente.";
  }
}

/** Log estructurado sin UID, correo, tokens ni mensajes potencialmente sensibles. */
export function logAuthFlowError(stage, error) {
  console.error("[AuthFlow]", {
    stage,
    code: error?.code || error?.name || "unknown"
  });
}
