import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FIREBASE_AUTH_DOMAIN,
  resolveFirebaseAuthDomain
} from "../src/config/authDomain.js";
import {
  clearPendingRegistration,
  getPostAuthPath,
  getRecoveryPath,
  readPendingRegistration,
  savePendingRegistration,
  validateRegistrationUsername
} from "../src/services/googleRegistration.js";

/**
 * Almacén mínimo compatible con sessionStorage. Mantiene las pruebas puras y
 * evita depender de un DOM artificial para validar el contrato de redirección.
 */
function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("authDomain usa el mismo origen en ambos dominios publicados", () => {
  assert.equal(resolveFirebaseAuthDomain("talkingcroow.com"), "talkingcroow.com");
  assert.equal(resolveFirebaseAuthDomain("talking-crow.web.app"), "talking-crow.web.app");
});

test("authDomain conserva firebaseapp.com en localhost y hosts desconocidos", () => {
  assert.equal(resolveFirebaseAuthDomain("localhost"), DEFAULT_FIREBASE_AUTH_DOMAIN);
  assert.equal(resolveFirebaseAuthDomain("127.0.0.1"), DEFAULT_FIREBASE_AUTH_DOMAIN);
});

test("username conserva presentación y normaliza la reserva", () => {
  assert.deepEqual(validateRegistrationUsername("  Crow User_1  "), {
    displayUsername: "Crow User_1",
    normalizedUsername: "crow user_1"
  });
});

test("username rechaza símbolos, varios espacios y longitudes fuera del contrato", () => {
  for (const invalidUsername of ["ab", "crow@@", "crow  user", "1234567890123456789"]) {
    assert.throws(
      () => validateRegistrationUsername(invalidUsername),
      (error) => error.code === "INVALID_USERNAME"
    );
  }
});

test("estado pendiente sobrevive al redirect y solo se borra explícitamente", () => {
  const storage = createMemoryStorage();
  const now = Date.now();
  savePendingRegistration({ displayUsername: "Crow_User", desktop: true }, storage);

  assert.deepEqual(readPendingRegistration(storage, now), {
    displayUsername: "Crow_User",
    desktop: true
  });
  assert.notEqual(readPendingRegistration(storage, now), null);

  clearPendingRegistration(storage);
  assert.equal(readPendingRegistration(storage, now), null);
});

test("estado pendiente expirado obliga a recuperación guiada", () => {
  const storage = createMemoryStorage();
  const now = Date.now();
  savePendingRegistration({ displayUsername: "Crow_User", desktop: false }, storage);

  assert.equal(readPendingRegistration(storage, now + (16 * 60 * 1000)), null);
});

test("destinos solo permiten dashboard, auth-desktop y registro de recuperación", () => {
  assert.equal(getPostAuthPath(""), "/dashboard");
  assert.equal(getPostAuthPath("?desktop=true"), "/auth-desktop");
  assert.equal(getRecoveryPath(""), "/register?resume=true");
  assert.equal(getRecoveryPath("?desktop=true"), "/register?resume=true&desktop=true");
});

