import test from "node:test";
import assert from "node:assert/strict";
import { parseResumeText } from "../src/services/resumeTextParser.js";

test("resume parser extracts contact details and common resume sections", () => {
  const text = `Farhana Mumtaj\nfarhana@example.com | +91 98765 43210\nhttps://github.com/farhana\n\nPROFESSIONAL SUMMARY\nFinal-year AI student interested in full-stack development.\n\nTECHNICAL SKILLS\nJavaScript, React, Node.js, PostgreSQL\n\nEDUCATION\nB.Tech Artificial Intelligence\nExample Institute\n2022 - 2026\n\nPROJECTS\nHirely\nBuilt a resume optimization application.`;
  const result = parseResumeText(text, "Farhana_Resume.pdf");
  assert.equal(result.resume.personalInformation.fullName, "Farhana Mumtaj");
  assert.equal(result.resume.personalInformation.email, "farhana@example.com");
  assert.match(result.resume.personalInformation.phone, /98765/);
  assert.equal(
    result.resume.personalInformation.github,
    "https://github.com/farhana",
  );
  assert.match(result.resume.professionalSummary, /Final-year AI student/);
  assert.deepEqual(result.resume.resumeData.skillCategories[0].skills, [
    "JavaScript",
    "React",
    "Node.js",
    "PostgreSQL",
  ]);
  assert.equal(result.resume.resumeData.education.length, 1);
  assert.match(
    result.resume.resumeData.projects[0].description,
    /Built a resume optimization application/,
  );
  assert.equal(result.hasDetectedSections, true);
});

test("resume parser preserves text when no known headings are found and warns user", () => {
  const text =
    "Farhana Mumtaj\nA resume with unusual section names and useful details.";
  const result = parseResumeText(text, "my-resume.txt");
  assert.equal(result.resume.professionalSummary, text);
  assert.equal(result.hasDetectedSections, false);
  assert.ok(
    result.warnings.some((warning) => warning.includes("manual organization")),
  );
});

test("resume parser does not add skills that are not present in extracted text", () => {
  const result = parseResumeText(
    "Candidate Name\nSKILLS\nJavaScript, React",
    "resume.txt",
  );
  assert.deepEqual(result.resume.resumeData.skillCategories[0].skills, [
    "JavaScript",
    "React",
  ]);
});

test("resume parser caps imported skill entries and keeps them as plain text", () => {
  const skills = Array.from(
    { length: 130 },
    (_, index) => `Skill${index}`,
  ).join(", ");
  const result = parseResumeText(`Candidate\nSKILLS\n${skills}`, "resume.pdf");
  assert.equal(result.resume.resumeData.skillCategories[0].skills.length, 100);
  assert.equal(result.resume.resumeData.skillCategories[0].skills[0], "Skill0");
});

test("resume parser warns when extracted text is capped", () => {
  const result = parseResumeText(`Name\n${"A".repeat(100_010)}`, "resume.txt");
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("first 100,000 characters"),
    ),
  );
  assert.ok(result.extractedCharacters > 100_000);
});
