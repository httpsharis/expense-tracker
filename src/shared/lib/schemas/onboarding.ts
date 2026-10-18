import { z } from "zod";

export const onboardingSchema = z.object({
  startingBalance: z
    .string()
    .optional()
    .refine((v) => {
      if (!v || !v.trim()) return true;
      const sanitized = v.replace(/,/g, "").trim();
      return (
        /^\d+(?:\.\d+)?$/.test(sanitized) &&
        Number.isFinite(Number(sanitized)) &&
        Number(sanitized) >= 0
      );
    }, "Please enter a valid starting balance (0 or greater)"),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;