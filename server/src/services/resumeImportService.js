import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export { parseResumeText } from "./resumeTextParser.js";

export async function extractResumeText(file) {
  const name = String(file.originalname || "").toLowerCase();
  let text = "";
  if (name.endsWith(".pdf")) {
    const parsed = await pdfParse(file.buffer);
    text = parsed.text || "";
  } else if (name.endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    text = parsed.value || "";
  } else if (name.endsWith(".txt")) {
    text = file.buffer.toString("utf8");
  } else {
    throw Object.assign(new Error("Upload a PDF, DOCX, or TXT resume."), {
      status: 415,
      code: "UNSUPPORTED_FILE_TYPE",
    });
  }
  text = text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[\t ]+$/gm, "")
    .trim();
  if (!text)
    throw Object.assign(
      new Error(
        "No readable text was found. If this is a scanned PDF, use a text-based PDF or paste the text into a TXT file.",
      ),
      { status: 422, code: "EMPTY_RESUME_TEXT" },
    );
    console.log("EXTRACTED RESUME TEXT:\n", text);
  return text;
}
