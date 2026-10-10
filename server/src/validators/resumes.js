import { z } from "zod";
const optionalText = (max = 5000) =>
  z.string().trim().max(max).optional().default("");
const link = z
  .string()
  .trim()
  .max(500)
  .optional()
  .default("")
  .refine((v) => !v || /^https:\/\//i.test(v), "Links must use HTTPS.");
const record = z
  .object({
    id: z.string().max(80).optional(),
    title: optionalText(200),
    organization: optionalText(200),
    degree: optionalText(200),
    field: optionalText(200),
    startDate: optionalText(20),
    endDate: optionalText(20),
    current: z.boolean().optional().default(false),
    description: optionalText(5000),
    bullets: z
      .array(z.string().trim().max(1000))
      .max(30)
      .optional()
      .default([]),
    technologies: z
      .array(z.string().trim().max(100))
      .max(50)
      .optional()
      .default([]),
    url: link,
  })
  .passthrough();
export const resumeSchema = z
  .object({
    title: z.string().trim().min(1).max(160).default("Untitled Resume"),
    designation: optionalText(200),
    preferredFormat: z.enum(["one-page", "standard"]).default("standard"),
    personalInformation: z
      .object({
        fullName: optionalText(120),
        phone: optionalText(40),
        email: z.string().trim().max(254).optional().default(""),
        location: optionalText(200),
        linkedin: link,
        github: link,
        leetcode: link,
        portfolio: link,
      })
      .passthrough()
      .default({}),
    professionalSummary: optionalText(5000),
    resumeData: z
      .object({
        education: z.array(record).max(30).default([]),
        experience: z.array(record).max(50).default([]),
        internships: z.array(record).max(50).default([]),
        projects: z.array(record).max(50).default([]),
        achievements: z.array(record).max(50).default([]),
        certifications: z.array(record).max(50).default([]),
        skillCategories: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(100),
              skills: z.array(z.string().trim().min(1).max(100)).max(100),
            }),
          )
          .max(30)
          .default([]),
        softSkills: z.array(z.string().trim().max(100)).max(100).default([]),
      })
      .passthrough()
      .default({}),
    sectionOrder: z
      .array(z.string().max(100))
      .max(40)
      .default([
        "summary",
        "skills",
        "education",
        "experience",
        "projects",
        "achievements",
        "certifications",
        "softSkills",
      ]),
    sectionVisibility: z.record(z.boolean()).default({}),
    customSectionConfiguration: z
      .array(
        z.object({
          id: z.string().max(80).optional(),
          title: z.string().trim().min(1).max(100),
          content: z.array(z.string().max(2000)).max(100),
        }),
      )
      .max(20)
      .default([]),
  })
  .strict();
export const resumeIdSchema = z.string().uuid();
