import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin } from "../src/utils/originPolicy.js";

test("origin policy allows the configured origin independent of trailing path", () => {
  assert.equal(
    isAllowedOrigin(
      "https://resume.example.com",
      "https://resume.example.com/",
    ),
    true,
  );
});

test("origin policy rejects other and malformed browser origins", () => {
  assert.equal(
    isAllowedOrigin("https://attacker.example", "https://resume.example.com"),
    false,
  );
  assert.equal(
    isAllowedOrigin("not an origin", "https://resume.example.com"),
    false,
  );
});

test("origin policy permits requests without an Origin header for server-to-server clients", () => {
  assert.equal(isAllowedOrigin(undefined, "http://localhost:5173"), true);
});
