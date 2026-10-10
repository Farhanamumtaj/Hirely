import test from "node:test";
import assert from "node:assert/strict";
import { profileSchema } from "../src/validators/profile.js";

test("profile schema accepts a trimmed non-empty display name", () => {
  const result = profileSchema.safeParse({ fullName: "  Farhana Mumtaj  " });
  assert.equal(result.success, true);
  assert.equal(result.data.fullName, "Farhana Mumtaj");
});

test("profile schema rejects blank, oversized, and unexpected fields", () => {
  assert.equal(profileSchema.safeParse({ fullName: "   " }).success, false);
  assert.equal(
    profileSchema.safeParse({ fullName: "x".repeat(121) }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ fullName: "Farhana", email: "other@example.com" })
      .success,
    false,
  );
});
