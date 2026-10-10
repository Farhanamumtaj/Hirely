import PDFDocument from "pdfkit";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

const SECTION_META = [
  { id: "summary", heading: "PROFESSIONAL SUMMARY" },
  { id: "skills", heading: "TECHNICAL SKILLS" },
  { id: "education", heading: "EDUCATION" },
  { id: "experience", heading: "EXPERIENCE" },
  { id: "internships", heading: "INTERNSHIPS" },
  { id: "projects", heading: "PROJECTS" },
  { id: "achievements", heading: "ACHIEVEMENTS" },
  { id: "certifications", heading: "CERTIFICATIONS AND PARTICIPATION" },
  { id: "softSkills", heading: "SOFT SKILLS" },
];

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const joined = (...values) => values.map(clean).filter(Boolean).join(" ");
function dates(item) {
  const start = clean(item.startDate);
  const end = item.current ? "Present" : clean(item.endDate);
  return [start, end].filter(Boolean).join(" – ");
}
function recordLines(sectionId, item) {
  const lines = [];
  if (sectionId === "education") {
    lines.push(joined(item.degree, item.field ? `— ${item.field}` : ""));
    if (item.organization) lines.push(clean(item.organization));
    if (dates(item)) lines.push(dates(item));
  } else if (sectionId === "experience" || sectionId === "internships") {
    lines.push(
      joined(item.title, item.organization ? `— ${item.organization}` : ""),
    );
    if (dates(item)) lines.push(dates(item));
  } else {
    if (item.title) lines.push(clean(item.title));
    if (item.organization) lines.push(clean(item.organization));
    if (dates(item)) lines.push(dates(item));
  }
  const bullets = Array.isArray(item.bullets)
    ? item.bullets.map(clean).filter(Boolean)
    : [];
  const description = clean(item.description);
  if (description)
    lines.push(
      ...description
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          return /^[-•*]\s/.test(trimmed)
            ? `• ${trimmed.replace(/^[-•*]\s*/, "")}`
            : trimmed;
        })
        .filter(Boolean),
    );
  lines.push(...bullets.map((line) => `• ${line}`));
  if (sectionId === "projects" && item.technologies?.length)
    lines.push(
      `Technologies: ${item.technologies.map(clean).filter(Boolean).join(", ")}`,
    );
  if (item.url) lines.push(clean(item.url));
  return lines.filter(Boolean);
}
function contentFor(section, resume) {
  const data = resume.resumeData || {};
  if (section.id === "summary")
    return clean(resume.professionalSummary)
      ? [{ lines: [clean(resume.professionalSummary)] }]
      : [];
  if (section.id === "skills")
    return (data.skillCategories || [])
      .map((category) => ({
        lines: [
          joined(
            category.name ? `${clean(category.name)}:` : "",
            (category.skills || []).map(clean).filter(Boolean).join(", "),
          ),
        ],
      }))
      .filter((block) => block.lines[0]);
  if (section.id === "softSkills")
    return (data.softSkills || []).map(clean).filter(Boolean).length
      ? [
          {
            lines: [
              (data.softSkills || []).map(clean).filter(Boolean).join(", "),
            ],
          },
        ]
      : [];
  const key = section.id;
  return (data[key] || [])
    .map((item) => ({ lines: recordLines(key, item) }))
    .filter((block) => block.lines.length);
}
function documentModel(resume) {
  const personal = resume.personalInformation || {};
  const contact = [personal.location, personal.phone, personal.email]
    .map(clean)
    .filter(Boolean)
    .join(" | ");
  const links = [
    ["LinkedIn", personal.linkedin],
    ["GitHub", personal.github],
    ["LeetCode", personal.leetcode],
    ["Portfolio", personal.portfolio],
  ]
    .filter(([, url]) => clean(url))
    .map(([label, url]) => `${label}: ${clean(url)}`)
    .join(" | ");
  const order = Array.isArray(resume.sectionOrder)
    ? resume.sectionOrder
    : SECTION_META.map((section) => section.id);
  const sections = [...SECTION_META]
    .sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    })
    .filter((section) => resume.sectionVisibility?.[section.id] !== false)
    .map((section) => ({ ...section, blocks: contentFor(section, resume) }))
    .filter((section) => section.blocks.length);
  return { personal, contact, links, sections };
}

export async function createPdf(resume) {
  const model = documentModel(resume);
  const compact = resume.preferredFormat === "one-page";
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 42, bottom: 42, left: 48, right: 48 },
    info: {
      Title: resume.title || "Resume",
      Author: model.personal.fullName || "Hirely",
    },
  });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .font("Helvetica-Bold")
    .fontSize(compact ? 17 : 19)
    .text(clean(model.personal.fullName) || "YOUR NAME", {
      align: "center",
      width,
    });
  if (clean(resume.designation))
    doc
      .moveDown(0.15)
      .font("Helvetica")
      .fontSize(9)
      .text(clean(resume.designation), { align: "center" });
  doc.moveDown(0.25).font("Helvetica").fontSize(8.5);
  if (model.contact) doc.text(model.contact, { align: "center" });
  if (model.links)
    doc
      .moveDown(0.1)
      .fontSize(7.5)
      .text(model.links, { align: "center", width });
  doc
    .moveDown(0.35)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(0.7)
    .strokeColor("#444444")
    .stroke();
  doc.moveDown(compact ? 0.3 : 0.45);
  for (const section of model.sections) {
    doc
      .font("Helvetica-Bold")
      .fontSize(compact ? 9 : 10)
      .fillColor("#111111")
      .text(section.heading, { continued: false });
    doc
      .moveDown(0.08)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .lineWidth(0.45)
      .strokeColor("#777777")
      .stroke();
    doc.moveDown(0.15);
    for (const block of section.blocks) {
      block.lines.forEach((line, index) => {
        const isFirst = index === 0;
        const bulletLike = /^[-•*]\s/.test(line);
        const text = line.replace(/^[-•*]\s*/, "");
        doc
          .font(
            isFirst &&
              [
                "education",
                "experience",
                "internships",
                "projects",
                "achievements",
                "certifications",
              ].includes(section.id)
              ? "Helvetica-Bold"
              : "Helvetica",
          )
          .fontSize(compact ? 8 : 9)
          .fillColor("#111111");
        doc.text(bulletLike ? `• ${text}` : text, {
          width: width - (bulletLike ? 8 : 0),
          indent: bulletLike ? 8 : 0,
          lineGap: compact ? 0.5 : 1,
        });
      });
      doc.moveDown(compact ? 0.15 : 0.3);
    }
    doc.moveDown(compact ? 0.1 : 0.2);
  }
  doc.end();
  await finished;
  return Buffer.concat(chunks);
}

export async function createDocx(resume) {
  const model = documentModel(resume);
  const children = [];
  children.push(
    new Paragraph({
      alignment: "center",
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: clean(model.personal.fullName) || "YOUR NAME",
          bold: true,
          size: 34,
        }),
      ],
    }),
  );
  if (clean(resume.designation))
    children.push(
      new Paragraph({
        alignment: "center",
        spacing: { after: 80 },
        children: [new TextRun({ text: clean(resume.designation), size: 20 })],
      }),
    );
  if (model.contact)
    children.push(
      new Paragraph({
        alignment: "center",
        spacing: { after: 50 },
        children: [new TextRun({ text: model.contact, size: 18 })],
      }),
    );
  if (model.links)
    children.push(
      new Paragraph({
        alignment: "center",
        spacing: { after: 180 },
        children: [new TextRun({ text: model.links, size: 16 })],
      }),
    );
  for (const section of model.sections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2,
        thematicBreak: true,
        spacing: { before: 220, after: 90 },
        keepNext: true,
      }),
    );
    for (const block of section.blocks) {
      block.lines.forEach((line, index) => {
        const bullet = /^[-•*]\s/.test(line);
        const text = line.replace(/^[-•*]\s*/, "");
        children.push(
          new Paragraph({
            bullet: bullet ? { indent: 240 } : undefined,
            spacing: { after: 45 },
            children: [
              new TextRun({
                text,
                bold:
                  index === 0 &&
                  [
                    "education",
                    "experience",
                    "internships",
                    "projects",
                    "achievements",
                    "certifications",
                  ].includes(section.id),
              }),
            ],
          }),
        );
      });
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    }
  }
  const doc = new Document({
    creator: "Hirely",
    title: resume.title || "Resume",
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export function safeFilename(title, extension) {
  const base =
    clean(title)
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "resume";
  return `${base}.${extension}`;
}
