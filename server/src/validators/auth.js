import { z } from "zod";
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    email,
    password: z
      .string()
      .min(10)
      .max(128)
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^A-Za-z0-9]/, "Password must include a symbol"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export const googleSchema = z.object({
  credential: z.string().min(20).max(10000),
});
