import { z } from "zod";
export const optimizationSchema = z
  .object({
    jobDescription: z
      .string()
      .trim()
      .min(
        80,
        "Please provide a complete job description (at least 80 characters).",
      )
      .max(16000, "Job description must be 16,000 characters or fewer."),
  })
  .strict();
