import { z } from "zod";

import { zodMessages } from "@/core/messages";
import { validatePositiveNumber } from "@/validators/commonRules";

export const OnboardingFormSchema = z.object({
	complete: z.boolean({
		required_error: zodMessages.error.required.fieldIsRequired("Complete"),
		invalid_type_error: zodMessages.error.invalid.invalidBoolean("Complete")
	}),
	accreditationStatus: z.boolean({
		required_error: zodMessages.error.required.fieldIsRequired("Accreditation Status"),
		invalid_type_error: zodMessages.error.invalid.invalidBoolean("Accreditation Status")
	}),
	onboardingData: z.any({
		required_error: zodMessages.error.required.fieldIsRequired("Onboarding Data"),
		invalid_type_error: zodMessages.error.invalid.invalidObject("Onboarding Data")
	}),
	currentStep: validatePositiveNumber("Current Step")
});

export type OnboardingFormSchemaType = z.infer<typeof OnboardingFormSchema>;
