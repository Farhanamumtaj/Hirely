import { z } from "zod";
export const profileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Enter your full name.")
      .max(120, "Name must be 120 characters or fewer."),
  })
  .strict();
