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
  ["project", "projects"],
  ["personal projects", "projects"],
  ["academic projects", "projects"],
  ["key projects", "projects"],

  ["achievements", "achievements"],
  ["awards and achievements", "achievements"],
  ["awards", "achievements"],
  ["accomplishments", "achievements"],

  ["certifications", "certifications"],
  ["certificates", "certifications"],
  ["certificate", "certifications"],
  ["certification", "certifications"],
  ["certifications and participation", "certifications"],
  ["certifications and courses", "certifications"],

  ["soft skills", "softSkills"],
  ["interpersonal skills", "softSkills"],
]);

const BOUNDARY_HEADINGS = new Set([
  "contact me",
  "contact",
  "personal information",
  "personal details",
  "info about me",
  "about me",
  "languages known",
  "language",
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

function stripImportPlaceholder(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/^Imported\s+Skills?\s*[—–-]\s*review\s*:?\s*/i, "")
    .replace(/^Imported\s+content\s*[—–-]\s*review(?:\s+and\s+organize)?/i, "")
    .replace(/^\s*[:：—–-]\s*/, "")
    .trim();
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

function isDateLine(line) {
  return /^(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*)?\d{4}\s*(?:-|–|—|to)\s*(?:present|current|now|(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*)?\d{4})$/i.test(
    line.trim(),
  );
}

function extractDates(lines) {
  for (const line of lines) {
    if (!isDateLine(line)) continue;

    const match = line.match(
      /(.+?)\s*(?:-|–|—|\bto\b)\s*(present|current|now|.+)$/i,
    );

    if (match) {
      return {
        startDate: match[1].trim(),
        endDate: /^(present|current|now)$/i.test(match[2].trim())
          ? ""
          : match[2].trim(),
        current: /^(present|current|now)$/i.test(match[2].trim()),
      };
    }
  }

  return { startDate: "", endDate: "", current: false };
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

    if (BOUNDARY_HEADINGS.has(normalized)) {
      current = null;
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

function emptyRecord() {
  return {
    title: "",
    organization: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
    bullets: [],
    technologies: [],
    url: "",
  };
}

function uniqueLines(lines) {
  return [...new Set(lines.map(cleanLine).filter(Boolean))];
}

function isLikelyOrganization(line) {
  const value = cleanLine(line);
  if (!value || value.length > 100) return false;
  if (/@|https?:\/\/|www\.|\d{7,}/i.test(value)) return false;
  if (
    /^(experience|education|skills|projects|certificates|certifications|profile|summary|contact me)$/i.test(
      value,
    )
  ) {
    return false;
  }

  const upper = value === value.toUpperCase();
  const hasOrganizationWord =
    /\b(college|university|school|institute|technovation|global|services|serv|technologies|technology|limited|ltd|inc|corporation|company|pvt|engineering)\b/i.test(
      value,
    );

  return upper && (value.includes(",") || hasOrganizationWord);
}

function isLikelyTitle(line) {
  const value = cleanLine(line);
  if (!value || value.length > 90 || isDateLine(value)) return false;

  return /^(design engineer|engineer|software engineer|intern|trainee|developer|analyst|manager|mechanical engineer|project engineer)$/i.test(
    value,
  );
}

function looksLikeSectionHeading(line) {
  const normalized = normalizeHeading(line);
  return HEADING_ALIASES.has(normalized) || BOUNDARY_HEADINGS.has(normalized);
}

function extractOrganizationRecords(allLines, sectionName) {
  const lines = uniqueLines(allLines);
  const records = [];
  const usedIndexes = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (usedIndexes.has(i) || !isLikelyOrganization(lines[i])) continue;

    const organization = lines[i];

    // Skip schools and colleges when extracting work records,
    // and skip ordinary employers when extracting education.
    const educationOrganization =
      /\b(college|university|school|institute)\b/i.test(organization);

    if (sectionName === "education" && !educationOrganization) {
      continue;
    }

    if (
      ["experience", "internships"].includes(sectionName) &&
      educationOrganization
    ) {
      continue;
    }

    const before = lines.slice(Math.max(0, i - 3), i);
    const after = [];

    for (let j = i + 1; j < lines.length; j++) {
      if (isLikelyOrganization(lines[j]) || looksLikeSectionHeading(lines[j])) {
        break;
      }

      after.push(lines[j]);

      // Prevent an unrelated later section from being swallowed
      // if the PDF extractor has placed a heading inside a block.
      if (after.length >= 18) break;
    }

    const nearby = [...before, ...after];
    const dates = extractDates(nearby);
    const titleLine = [...before, ...after].find(isLikelyTitle) || "";

    const detailLines = after.filter(
      (line) =>
        !isDateLine(line) &&
        !isLikelyTitle(line) &&
        !/^affli?ated to\b/i.test(line) &&
        !/^secured\s+\d/i.test(line) &&
        !/^cgpa\s*:/i.test(line),
    );

    let degree = "";
    let field = "";

    if (sectionName === "education") {
      const degreeLine = detailLines.find((line) =>
        /\b(B\.?E\.?|B\.?Tech|M\.?E\.?|M\.?Tech|BSc|MSc|Bachelor|Master|Diploma|HSC|SSLC|Higher Secondary)\b/i.test(
          line,
        ),
      );

      degree = degreeLine || "";
      field =
        degreeLine?.match(
          /\b(Aeronautical Engineering|Mechanical Engineering|Computer Science|Information Technology|Electronics|Electrical Engineering)\b/i,
        )?.[0] || "";
    }

    const description = detailLines
      .filter((line) => line !== degree)
      .join("\n")
      .slice(0, 5000);

    const record = {
      ...emptyRecord(),
      title: sectionName === "education" ? degree : titleLine || "",
      organization,
      degree,
      field,
      ...dates,
      description,
    };

    if (sectionName === "education" && !degree && !description) {
      // Keep the institution instead of dropping a potentially
      // useful record whose degree was extracted elsewhere.
      record.description = "";
    }

    records.push(record);
    usedIndexes.add(i);
  }

  return records;
}

function parseGenericRecords(sections, key) {
  const lines = getSectionLines(sections, key);
  if (!lines.length) return [];

  if (["experience", "internships"].includes(key)) {
    return extractOrganizationRecords(lines, key);
  }

  if (key === "education") {
    return extractOrganizationRecords(lines, key);
  }

  const records = [];
  let current = [];

  for (const line of lines) {
    if (
      current.length &&
      (/^[-•*]\s*/.test(line) ||
        /^(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:19|20)\d{2}$/i.test(line))
    ) {
      current.push(line);
      continue;
    }

    if (current.length && current.join(" ").length > 250) {
      records.push(current);
      current = [];
    }

    current.push(line);
  }

  if (current.length) records.push(current);

  return records.map((group) => {
    const record = emptyRecord();
    record.title = group[0].slice(0, 200);
    record.description = group.slice(1).join("\n").slice(0, 5000);
    return record;
  });
}

function parseSkills(sections, key) {
  const lines = getSectionLines(sections, key);
  if (!lines.length) return [];

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

  const text = lines.join("\n").replace(/^Technical Skills\s*:?\s*/i, "");
  const categories = [];
  const categoryPattern =
    /(?:^|[,|]\s*)(Languages?|Web|AI|Database|Databases|Tools|Concepts)\s*:/gi;
  const matches = [...text.matchAll(categoryPattern)];

  if (matches.length) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const start = match.index + match[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;

      const skills = text
        .slice(start, end)
        .split(/[,;|•\n]+/)
        .map((skill) => skill.trim())
        .filter(
          (skill) => skill && skill.length <= 100 && !isPlaceholder(skill),
        );

      if (skills.length) {
        categories.push({
          name: categoryAliases[match[1]] || match[1],
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

function findName(lines) {
  const excludedWords =
    /\b(experience|education|skills|contact|profile|summary|engineer|intern|project|certificate|certification|syllabus|school|college|university|matriculation|higher secondary|degree|affiliated|state|cgpa|passport|languages|technical|competencies|company|limited|private)\b/i;

  const cleanedLines = lines.map((line) => cleanLine(line));

  // Use the contact details as anchors because the name often appears nearby.
  const contactIndexes = [];

  cleanedLines.forEach((line, index) => {
    if (findEmail([line]) || findPhone([line])) {
      contactIndexes.push(index);
    }
  });

  const candidates = cleanedLines
    .map((line, index) => {
      const value = line.trim();
      const words = value.split(/\s+/);

      if (
        value.length < 4 ||
        value.length > 50 ||
        words.length < 2 ||
        words.length > 4 ||
        excludedWords.test(value) ||
        findEmail([value]) ||
        findPhone([value]) ||
        isDateLine(value) ||
        isLikelyOrganization(value) ||
        /^https?:\/\//i.test(value) ||
        /^www\./i.test(value) ||
        /^[+()\d\s.-]+$/.test(value)
      ) {
        return null;
      }

      // Allow digits inside a word in case PDF extraction misreads a letter.
      if (!/^[A-Z0-9][A-Z0-9 .'-]+$/i.test(value)) {
        return null;
      }

      const uppercase = value === value.toUpperCase();

      const nearestContactDistance = contactIndexes.length
        ? Math.min(
            ...contactIndexes.map((contactIndex) =>
              Math.abs(index - contactIndex),
            ),
          )
        : 999;

      let score = 0;

      if (uppercase) score += 3;
      if (nearestContactDistance <= 1) score += 12;
      else if (nearestContactDistance <= 3) score += 8;
      else if (nearestContactDistance <= 5) score += 3;

      // Penalize text immediately associated with school details.
      const nearbyText = cleanedLines
        .slice(Math.max(0, index - 2), Math.min(cleanedLines.length, index + 4))
        .join(" ");

      if (
        /\b(school|matriculation|syllabus|higher secondary|college|university)\b/i.test(
          nearbyText,
        )
      ) {
        score -= 5;
      }

      return { value, score, index };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return candidates[0]?.value || "";
}

function findSummary(lines, sections, hasDetectedSections) {
  const sectionSummary = getSectionText(sections, "summary");
  if (sectionSummary) return sectionSummary.slice(0, 5000);

  // PDF extraction can move a profile paragraph away from its heading.
  const paragraph = lines.find((line) =>
    /^(hello,?\s+i am|i am a|experienced\s+\w+|professional\s+\w+)/i.test(line),
  );

  if (paragraph) return paragraph.slice(0, 5000);

  return hasDetectedSections ? "" : lines.join("\n").slice(0, 5000);
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

  const email = findEmail(lines);
  const phone = findPhone(lines);
  const name = findName(lines);
  const links = findUrls(fullText);

  const linkedin = links.find((url) => /linkedin\.com/i.test(url));
  const github = links.find((url) => /github\.com/i.test(url));
  const leetcode = links.find((url) => /leetcode\.com/i.test(url));
  const portfolio = links.find(
    (url) => !/linkedin\.com|github\.com|leetcode\.com/i.test(url),
  );

  const summary = findSummary(lines, sections, hasDetectedSections);

  const title =
    String(filename)
      .replace(/\.(pdf|docx|txt)$/i, "")
      .replace(/[_-]+/g, " ")
      .trim()
      .slice(0, 150) || "Imported Resume";

  // Include the text before the first recognized heading so an
  // employer appearing before EXPERIENCE is not silently discarded.
  const experienceLines = uniqueLines([
    ...header,
    ...(sections.experience || []),
  ]);

  const internshipLines = uniqueLines([
    ...(sections.internships || []),
    ...lines.filter((line) =>
      /^(?:intern|internship|intern trainee)$/i.test(line),
    ),
  ]);

  const educationRecords = parseGenericRecords(sections, "education");
  const experienceRecords = extractOrganizationRecords(
    experienceLines,
    "experience",
  );
  const internshipRecords = extractOrganizationRecords(
    internshipLines,
    "internships",
  );

  const projectRecords = parseGenericRecords(sections, "projects");
  const achievementRecords = parseGenericRecords(sections, "achievements");
  const certificationRecords = parseGenericRecords(sections, "certifications");

  const softSkills = getSectionLines(sections, "softSkills")
    .join("\n")
    .split(/[\n,;|•]+/)
    .map((skill) => skill.trim())
    .filter((skill) => skill && skill.length <= 100 && !isPlaceholder(skill))
    .slice(0, 100);

  // Do not put sensitive identity numbers into a resume field.
  // Location is extracted only when explicitly labelled.
  const location =
    fullText.match(/\b(?:LOC|LOCATION)\s*:\s*([^\n]+)/i)?.[1]?.trim() || "";

  const resume = {
    title,
    designation:
      lines.find((line) =>
        /^(design engineer|software engineer|mechanical engineer|aeronautical engineer|data analyst|developer)$/i.test(
          line,
        ),
      ) || "",
    preferredFormat: "standard",
    personalInformation: {
      fullName: name,
      phone,
      email,
      location,
      linkedin: normalizeUrl(linkedin),
      github: normalizeUrl(github),
      leetcode: normalizeUrl(leetcode),
      portfolio: normalizeUrl(portfolio),
    },
    professionalSummary: summary,
    resumeData: {
      education: educationRecords,
      experience: experienceRecords,
      internships: internshipRecords,
      projects: projectRecords,
      achievements: achievementRecords,
      certifications: certificationRecords,
      skillCategories: parseSkills(sections, "skills"),
      softSkills,
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
    "PDF reading order may differ from the original layout. Check that each employer, role, date, and description belongs to the correct entry.",
  ];

  if (!hasDetectedSections) {
    warnings.push(
      "No recognized section headings were detected. Review and organize the imported content manually.",
    );
  }

  if (!name) {
    warnings.push(
      "The name could not be identified confidently. Please check the personal information section.",
    );
  }

  if (!email || !phone) {
    warnings.push(
      "Some contact details could not be identified. Check the original document before completing your resume.",
    );
  }

  if (
    !experienceRecords.length &&
    /experience|employment|engineer/i.test(fullText)
  ) {
    warnings.push(
      "Work history could not be separated into reliable entries. Review the extracted text and add or correct entries manually.",
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
