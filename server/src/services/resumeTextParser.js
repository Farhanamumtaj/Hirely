const MAX_TEXT_LENGTH = 100_000;

const HEADING_ALIASES = new Map([
  ["summary", "summary"],
  ["professional summary", "summary"],
  ["profile", "summary"],
  ["professional profile", "summary"],
  ["career profile", "summary"],
  ["objective", "summary"],
  ["career objective", "summary"],

  ["skills", "skills"],
  ["technical skills", "skills"],
  ["core skills", "skills"],
  ["key skills", "skills"],
  ["technical expertise", "skills"],
  ["areas of expertise", "skills"],
  ["programming skills", "skills"],

  ["education", "education"],
  ["academic background", "education"],
  ["educational qualifications", "education"],
  ["educational qualification", "education"],
  ["qualifications", "education"],
  ["academic qualifications", "education"],

  ["experience", "experience"],
  ["work experience", "experience"],
  ["professional experience", "experience"],
  ["employment history", "experience"],
  ["work history", "experience"],

  ["internship", "internships"],
  ["internships", "internships"],
  ["internship experience", "internships"],
  ["internship experiences", "internships"],

  ["projects", "projects"],
  ["personal projects", "projects"],
  ["academic projects", "projects"],
  ["key projects", "projects"],

  ["achievements", "achievements"],
  ["awards and achievements", "achievements"],
  ["awards", "achievements"],
  ["accomplishments", "achievements"],

  ["certifications", "certifications"],
  ["certificates", "certifications"],
  ["certification", "certifications"],
  ["certifications and participation", "certifications"],
  ["certifications and courses", "certifications"],

  ["soft skills", "softSkills"],
  ["interpersonal skills", "softSkills"],
]);

function normalizeHeading(line) {
  return String(line || "")
    .toLowerCase()
    .replace(/^[\s:|–—-]+|[\s:|–—-]+$/g, "")
    .replace(/[^a-z0-9 &]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLine(line) {
  return String(line || "")
    .replace(/\u0000/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove parser-generated labels without deleting the
 * actual resume content that follows them.
 */

function stripImportPlaceholder(value) {
  let line = String(value || "")
    .replace(/\u00a0/g, " ")
    .trim();

  // Remove parser-generated prefixes while preserving
  // any real resume content that follows them.
  line = line.replace(/^Imported\s+Skills?\s*[—–-]\s*review\s*:?\s*/i, "");

  line = line.replace(
    /^Imported\s+content\s*[—–-]\s*review(?:\s+and\s+organize)?/i,
    "",
  );

  // Remove a separator left between the prefix and content.
  line = line.replace(/^\s*[:：—–-]\s*/, "").trim();

  return line;
}

function isPlaceholder(value) {
  const line = stripImportPlaceholder(value);

  return (
    !line ||
    /^(?:review(?:\s+and\s+organize)?|imported\s+(?:content|skills?))\s*[.!:：—–-]*$/i.test(
      line,
    )
  );
}

function cleanSectionLines(lines) {
  return lines
    .map(stripImportPlaceholder)
    .filter((line) => line && !isPlaceholder(line));
}

function findEmail(lines) {
  for (const line of lines) {
    const match = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

    if (match) return match[0];
  }

  return "";
}

function findPhone(lines) {
  for (const line of lines) {
    const match = line.match(/(?:\+\s*)?\d[\d ().-]{7,}\d/);

    if (match && match[0].replace(/\D/g, "").length >= 9) {
      return match[0].trim();
    }
  }

  return "";
}

function findUrls(text) {
  return (text.match(/(?:https?:\/\/|www\.)[^\s<>()|,]+/gi) || []).map((url) =>
    url.replace(/[.,;]+$/, ""),
  );
}

function normalizeUrl(url) {
  if (!url) return "";

  const value = url.trim();

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function parseSections(lines) {
  const sections = {};
  const header = [];
  let current = null;
  let foundHeadings = 0;

  for (const line of lines) {
    const normalized = line.length <= 120 ? normalizeHeading(line) : "";

    const heading = HEADING_ALIASES.get(normalized);

    if (heading) {
      current = heading;
      sections[current] ||= [];
      foundHeadings++;
      continue;
    }

    if (current) {
      sections[current].push(line);
    } else {
      header.push(line);
    }
  }

  return { sections, header, foundHeadings };
}

function getSectionLines(sections, key) {
  return cleanSectionLines(sections[key] || []);
}

function getSectionText(sections, key) {
  return getSectionLines(sections, key).join("\n").trim();
}

/**
 * Keep imported facts and wording.
 * For a one-line section, separate a record title from its
 * description where a clear separator exists.
 */
function splitRecordText(text, key) {
  const value = text.trim();

  if (!value) {
    return { title: "", description: "" };
  }

  // Work experience and internships often put the duties
  // after an em dash or en dash.
  if (["experience", "internships", "projects"].includes(key)) {
    const match = value.match(/^(.+?)\s+[–—]\s+(.+)$/);

    if (match) {
      return {
        title: match[1].trim(),
        description: match[2].trim(),
      };
    }
  }

  // Split achievements at a clear sentence or semicolon.
  if (key === "achievements") {
    const match = value.match(/^(.+?[.!?;])\s+(.+)$/);

    if (match) {
      return {
        title: match[1].trim(),
        description: match[2].trim(),
      };
    }
  }

  // Avoid putting an extremely long paragraph into the title.
  if (value.length > 200) {
    let splitAt = value.lastIndexOf(" ", 200);

    if (splitAt < 80) splitAt = 200;

    return {
      title: value.slice(0, splitAt).trim(),
      description: value.slice(splitAt).trim(),
    };
  }

  return { title: value, description: "" };
}

function toRecords(sections, key) {
  const lines = getSectionLines(sections, key);

  if (!lines.length) return [];

  const firstLine = lines[0];
  const remainingLines = lines.slice(1);

  let title;
  let description;

  if (remainingLines.length > 0) {
    title = firstLine.slice(0, 200);
    description = remainingLines.join("\n").slice(0, 5000);
  } else {
    const split = splitRecordText(firstLine, key);
    title = split.title;
    description = split.description.slice(0, 5000);
  }

  if (!title && !description) return [];

  return [
    {
      title,
      organization: "",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      current: false,
      description,
      bullets: [],
      technologies: [],
      url: "",
    },
  ];
}

function parseSkills(sections, key) {
  const lines = getSectionLines(sections, key);

  if (!lines.length) return [];

  const text = lines.join("\n").replace(/^Technical Skills\s*:?\s*/i, "");

  const categoryAliases = {
    Languages: "Programming Languages",
    Language: "Programming Languages",
    Web: "Web Technologies",
    AI: "AI & Computer Vision",
    Database: "Databases",
    Databases: "Databases",
    Tools: "Tools & Platforms",
    Concepts: "CS Fundamentals",
  };

  const categories = [];

  const categoryPattern =
    /(?:^|[,|]\s*)(Languages?|Web|AI|Database|Databases|Tools|Concepts)\s*:/gi;

  const matches = [...text.matchAll(categoryPattern)];

  if (matches.length) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const start = match.index + match[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;

      const name = match[1];
      const skills = text
        .slice(start, end)
        .split(/[,;|•\n]+/)
        .map((skill) => skill.trim())
        .filter(
          (skill) => skill && skill.length <= 100 && !isPlaceholder(skill),
        );

      if (skills.length) {
        categories.push({
          name: categoryAliases[name] || name,
          skills: [...new Set(skills)],
        });
      }
    }
  } else {
    const skills = text
      .split(/[\n,;|•]+/)
      .map((skill) => skill.trim())
      .filter((skill) => skill && skill.length <= 100 && !isPlaceholder(skill));

    if (skills.length) {
      categories.push({
        name: "Technical Skills",
        skills: [...new Set(skills)].slice(0, 100),
      });
    }
  }

  return categories.slice(0, 30);
}

export function parseResumeText(text, filename = "Imported Resume") {
  const rawText = String(text || "");
  const wasTruncated = rawText.length > MAX_TEXT_LENGTH;

  const lines = rawText
    .slice(0, MAX_TEXT_LENGTH)
    .replace(/\r/g, "")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);

  if (!lines.length) {
    throw Object.assign(new Error("No readable resume text was found."), {
      status: 422,
      code: "EMPTY_RESUME_TEXT",
    });
  }

  const { sections, header, foundHeadings } = parseSections(lines);

  const hasDetectedSections = foundHeadings > 0;
  const fullText = lines.join("\n");
  const headerText = header.join("\n");

  const email = findEmail(lines);
  const phone = findPhone(header);
  const links = findUrls(fullText);

  const name =
    header.find(
      (line) =>
        !findEmail([line]) &&
        !/\d{9,}/.test(line.replace(/\D/g, "")) &&
        !/^https?:\/\//i.test(line) &&
        !/^www\./i.test(line) &&
        !isPlaceholder(line) &&
        line.length <= 100,
    ) || "";

  const title =
    String(filename)
      .replace(/\.(pdf|docx|txt)$/i, "")
      .replace(/[_-]+/g, " ")
      .trim()
      .slice(0, 150) || "Imported Resume";

  const linkedin = links.find((url) => /linkedin\.com/i.test(url));

  const github = links.find((url) => /github\.com/i.test(url));

  const leetcode = links.find((url) => /leetcode\.com/i.test(url));

  const portfolio = links.find(
    (url) => !/linkedin\.com|github\.com|leetcode\.com/i.test(url),
  );

  const summary = getSectionText(sections, "summary");

  const professionalSummary = summary || (!hasDetectedSections ? fullText : "");

  const resume = {
    title,
    designation: "",
    preferredFormat: "standard",

    personalInformation: {
      fullName: name,
      phone,
      email,
      location: "",
      linkedin: normalizeUrl(linkedin),
      github: normalizeUrl(github),
      leetcode: normalizeUrl(leetcode),
      portfolio: normalizeUrl(portfolio),
    },

    professionalSummary: professionalSummary.slice(0, 5000),

    resumeData: {
      education: toRecords(sections, "education"),
      experience: toRecords(sections, "experience"),
      internships: toRecords(sections, "internships"),
      projects: toRecords(sections, "projects"),
      achievements: toRecords(sections, "achievements"),
      certifications: toRecords(sections, "certifications"),
      skillCategories: parseSkills(sections, "skills"),

      softSkills: getSectionLines(sections, "softSkills")
        .join("\n")
        .split(/[\n,;|•]+/)
        .map((skill) => skill.trim())
        .filter(
          (skill) => skill && skill.length <= 100 && !isPlaceholder(skill),
        )
        .slice(0, 100),
    },

    sectionOrder: [
      "summary",
      "skills",
      "education",
      "experience",
      "internships",
      "projects",
      "achievements",
      "certifications",
      "softSkills",
    ],

    sectionVisibility: {},
    customSectionConfiguration: [],
  };

  const warnings = [
    "Imported content is a draft. Verify all details before using or exporting the resume.",
  ];

  if (!hasDetectedSections) {
    warnings.push(
      "No recognized section headings were detected. The extracted text was placed in the summary for manual review and manual organization.",
    );
  }

  if (!headerText) {
    warnings.push(
      "Contact details and the name could not be confidently identified from the text before the first section heading.",
    );
  }

  if (wasTruncated) {
    warnings.push("Only the first 100,000 characters were imported.");
  }

  return {
    resume,
    hasDetectedSections,
    extractedCharacters: rawText.length,
    warnings,
  };
}
