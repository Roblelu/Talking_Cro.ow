import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createRegistrationDocuments } from "../src/services/googleRegistration.js";

const PROJECT_ID = "demo-talking-crow-auth";
let testEnvironment;

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8")
    }
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment?.cleanup();
});

function authenticatedDb(uid) {
  return testEnvironment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true
  }).firestore();
}

test("registro válido crea reserva, perfil y contacto bajo las reglas reales", async () => {
  const firestore = authenticatedDb("new-user");
  const user = { uid: "new-user", email: "new-user@example.test" };

  const result = await assertSucceeds(
    createRegistrationDocuments(firestore, user, "Crow User")
  );

  assert.equal(result.status, "created");
  assert.equal((await getDoc(doc(firestore, "users", user.uid))).data().username, "Crow User");
  assert.equal((await getDoc(doc(firestore, "usernames", "crow user"))).data().uid, user.uid);
});

test("reintento sobre perfil completo no reinicializa balances", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", "existing-user"), {
      purchased_croins: 75,
      promotional_croins: 3,
      creator_credits: 9,
      creator_earnings: 4,
      isPro: true,
      username: "Existing",
      createdAt: serverTimestamp()
    });
  });

  const firestore = authenticatedDb("existing-user");
  const result = await assertSucceeds(
    createRegistrationDocuments(firestore, { uid: "existing-user", email: "existing@example.test" }, "Different")
  );
  const profile = (await getDoc(doc(firestore, "users", "existing-user"))).data();

  assert.equal(result.status, "already-complete");
  assert.equal(profile.purchased_croins, 75);
  assert.equal(profile.isPro, true);
  assert.equal(profile.username, "Existing");
});

test("registro recupera una reserva heredada que ya pertenece al mismo UID", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "usernames", "reserved"), { uid: "orphan-user" });
  });

  const firestore = authenticatedDb("orphan-user");
  const result = await assertSucceeds(
    createRegistrationDocuments(firestore, { uid: "orphan-user", email: "orphan@example.test" }, "Reserved")
  );

  assert.equal(result.status, "created");
  assert.equal((await getDoc(doc(firestore, "users", "orphan-user"))).data().username, "Reserved");
});

test("registro rechaza un username reservado por otro UID", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "usernames", "taken"), { uid: "owner-user" });
  });

  const firestore = authenticatedDb("attacker-user");
  await assert.rejects(
    createRegistrationDocuments(firestore, { uid: "attacker-user", email: "attacker@example.test" }, "Taken"),
    (error) => error.code === "USERNAME_TAKEN"
  );
  assert.equal((await getDoc(doc(firestore, "users", "attacker-user"))).exists(), false);
});

test("reglas siguen bloqueando username_lowercase y cualquier campo no permitido", async () => {
  const firestore = authenticatedDb("schema-user");
  await assertFails(setDoc(doc(firestore, "users", "schema-user"), {
    purchased_croins: 0,
    promotional_croins: 24,
    creator_credits: 0,
    creator_earnings: 0,
    isPro: false,
    username: "SchemaUser",
    username_lowercase: "schemauser",
    createdAt: serverTimestamp()
  }));
});
