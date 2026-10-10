import test from "node:test";
import assert from "node:assert/strict";
import { parseOptimizationResponse } from "../src/services/optimizationResponse.js";

test("normalizes a valid JSON response and preserves evidence fields", () => {
  const result = parseOptimizationResponse(
    JSON.stringify({
      matchScore: 84.4,
      scoreExplanation: "Strong overlap.",
      matchedSkills: [{ skill: "React", evidence: "Project section" }],
      missingSkills: [
        { skill: "Kafka", importance: "high", note: "Not shown in resume" },
      ],
      strengths: ["Relevant project"],
      improvements: [
        {
          section: "Projects",
          currentText: "Built app",
          suggestedText: "Built app with React",
          reason: "Clarifies the tool already evidenced.",
        },
      ],
      learningPlan: [
        {
          skill: "Kafka",
          action: "Study fundamentals",
          resourceSearch: "Kafka beginner course",
        },
      ],
    }),
  );
  assert.equal(result.matchScore, 84);
  assert.equal(result.matchedSkills[0].evidence, "Project section");
  assert.equal(result.missingSkills[0].importance, "high");
  assert.match(result.disclaimer, /never added/i);
});

test("clamps scores and normalizes unexpected provider fields safely", () => {
  const result = parseOptimizationResponse(
    JSON.stringify({
      matchScore: 500,
      matchedSkills: [
        { skill: { injected: true }, evidence: "x".repeat(3000) },
        null,
      ],
      missingSkills: [{ skill: "Tool", importance: "critical", note: "Gap" }],
      strengths: ["okay", 17, "", "x".repeat(3000)],
      improvements: [{ suggestedText: "Suggestion" }],
    }),
  );
  assert.equal(result.matchScore, 100);
  assert.equal(result.matchedSkills[0].skill, "");
  assert.equal(result.matchedSkills[0].evidence.length, 2000);
  assert.equal(result.missingSkills[0].importance, "medium");
  assert.deepEqual(result.strengths, ["okay", "x".repeat(2000)]);
  assert.equal(result.improvements.length, 1);
});

test("rejects invalid JSON and non-object responses", () => {
  assert.throws(() => parseOptimizationResponse("not json"));
  assert.throws(() => parseOptimizationResponse("[]"));
  assert.throws(() => parseOptimizationResponse("```json\n{bad}\n```"));
});

test("accepts a fenced JSON object from providers", () => {
  const result = parseOptimizationResponse(
    '```json\n{"matchScore": 42, "strengths": ["Clear summary"]}\n```',
  );
  assert.equal(result.matchScore, 42);
  assert.deepEqual(result.strengths, ["Clear summary"]);
});
