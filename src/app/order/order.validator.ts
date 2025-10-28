import { z } from "zod";

import { validateEnum, validatePositiveNumber, validateString } from "@/validators/commonRules";

export const CartFormSchema = z.object({
	portfolioId: validatePositiveNumber("Portfolio ID"),
	shares: validatePositiveNumber("Shares")
});

export const CartUpdateFormSchema = z.object({
	shares: validatePositiveNumber("Shares"),
	updateStatus: validateEnum("Update status", ["INCREMENT", "DECREMENT"])
});

export const CheckoutFormSchema = z.object({
	accountId: validatePositiveNumber("Account ID")
});

export const OrderCompleteFormSchema = z.object({
	intentId: validateString("Intent ID")
});

export type CartFormSchemaType = z.infer<typeof CartFormSchema>;
export type CartUpdateFormSchemaType = z.infer<typeof CartUpdateFormSchema>;
