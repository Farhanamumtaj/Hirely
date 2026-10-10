const MAX_ITEMS = 8;
const MAX_TEXT = 2000;
const text = (value) =>
  typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "";
const textList = (value) =>
  Array.isArray(value)
    ? value.map(text).filter(Boolean).slice(0, MAX_ITEMS)
    : [];
const objectList = (value, fields) =>
  Array.isArray(value)
    ? value
        .slice(0, MAX_ITEMS)
        .filter(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        )
        .map((item) =>
          Object.fromEntries(fields.map((field) => [field, text(item[field])])),
        )
        .filter((item) => fields.some((field) => item[field]))
    : [];

/** Parse and normalize untrusted model output before it reaches the UI. */
export function parseOptimizationResponse(raw) {
  const clean = String(raw || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let value;
  try {
    value = JSON.parse(clean);
  } catch {
    throw new Error("Invalid AI JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid AI response shape");
  const score = Number(value.matchScore);
  const importance = (item) =>
    ["high", "medium", "low"].includes(item.importance)
      ? item.importance
      : "medium";
  const missingSkills = Array.isArray(value.missingSkills)
    ? value.missingSkills
        .slice(0, MAX_ITEMS)
        .filter(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        )
        .map((item) => ({
          skill: text(item.skill),
          note: text(item.note),
          importance: importance(item),
        }))
        .filter((item) => item.skill || item.note)
    : [];
  return {
    matchScore: Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : 0,
    scoreExplanation:
      text(value.scoreExplanation) || "This score is an estimate.",
    matchedSkills: objectList(value.matchedSkills, ["skill", "evidence"]),
    missingSkills,
    strengths: textList(value.strengths),
    improvements: objectList(value.improvements, [
      "section",
      "currentText",
      "suggestedText",
      "reason",
    ]),
    learningPlan: objectList(value.learningPlan, [
      "skill",
      "action",
      "resourceSearch",
    ]),
    disclaimer:
      "AI suggestions may be inaccurate. Verify every statement before using it. Missing skills are never added to your resume.",
  };
}
