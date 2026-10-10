import test from "node:test";
import assert from "node:assert/strict";
import { registerSchema, loginSchema } from "../src/validators/auth.js";
test("registration normalizes email and accepts a compliant password", () => {
  const r = registerSchema.safeParse({
    fullName: "Farhana",
    email: " FARHANA@example.com ",
    password: "SecurePass!123",
    confirmPassword: "SecurePass!123",
  });
  assert.equal(r.success, true);
  assert.equal(r.data.email, "farhana@example.com");
});
test("registration rejects mismatched passwords", () => {
  const r = registerSchema.safeParse({
    fullName: "Farhana",
    email: "f@example.com",
    password: "SecurePass!123",
    confirmPassword: "Different!123",
  });
  assert.equal(r.success, false);
});
test("registration rejects weak passwords", () => {
  const r = registerSchema.safeParse({
    fullName: "Farhana",
    email: "f@example.com",
    password: "password",
    confirmPassword: "password",
  });
  assert.equal(r.success, false);
});
test("login normalizes email", () => {
  const r = loginSchema.safeParse({
    email: " USER@Example.com ",
    password: "anything",
  });
  assert.equal(r.success, true);
  assert.equal(r.data.email, "user@example.com");
});
