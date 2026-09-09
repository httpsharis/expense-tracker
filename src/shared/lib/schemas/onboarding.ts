import { z } from "zod";

export const onboardingSchema = z.object({
    startingBalance: z
        .string()
        .min(1, 'Please enter a starting balance')
        .refine((v) => {
            const sanitized = v.replace(/,/g, "");
            return /^\d+(?:\.\d+)?$/.test(sanitized) && Number(sanitized) > 0;
            return /^\d+(?:\.\d+)?$/.test(sanitized) && Number.isFinite(Number(sanitized)) && Number(sanitized) >= 0;
        }, 'Please enter a valid starting balance')
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>