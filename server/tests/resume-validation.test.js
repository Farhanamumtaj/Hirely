import test from "node:test";
import assert from "node:assert/strict";
import { resumeSchema } from "../src/validators/resumes.js";
import { optimizationSchema } from "../src/validators/optimization.js";

const validResume = {
  title: "Test resume",
  personalInformation: { fullName: "Test User", email: "test@example.com" },
  resumeData: {
    skillCategories: [{ name: "Technical Skills", skills: ["JavaScript"] }],
  },
};

test("resume schema supplies safe defaults for optional resume sections", () => {
  const result = resumeSchema.safeParse(validResume);
  assert.equal(result.success, true);
  assert.deepEqual(result.data.resumeData.education, []);
  assert.equal(result.data.preferredFormat, "standard");
});

test("resume schema rejects non-HTTPS profile links", () => {
  const result = resumeSchema.safeParse({
    ...validResume,
    personalInformation: { linkedin: "http://example.com" },
  });
  assert.equal(result.success, false);
});

test("optimization schema rejects an empty or oversized job description", () => {
  assert.equal(
    optimizationSchema.safeParse({ jobDescription: "" }).success,
    false,
  );
  assert.equal(
    optimizationSchema.safeParse({ jobDescription: "x".repeat(50001) }).success,
    false,
  );
});
