import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { z } from "zod";

import { SortingHelper } from "@/core/sortingHelper";
import { BaseQuerySchema } from "@/validators/baseQuery.schema";
import { validateEmail, validateString } from "@/validators/commonRules";

export const ContactQuerySchema = <T extends PgTableWithColumns<any>>(
	sortingHelper: SortingHelper<T>
) => {
	const baseSchema = BaseQuerySchema(sortingHelper);

	return z.preprocess(
		(data: any) => ({
			...baseSchema.parse(data)
		}),
		z.object({
			...baseSchema.innerType().shape
		})
	);
};

export const ContactDeleteQuerySchema = z.object({
	ids: validateString("Contact IDs")
		.optional()
		.transform(value => (value ? value.split(",") : []))
		.refine(values => values.length === 0 || values.every(val => !isNaN(Number(val))), {
			message: "Invalid Contact IDs"
		})
		.transform(values => values.map(Number))
});

export const NewsletterQuerySchema = <T extends PgTableWithColumns<any>>(
	sortingHelper: SortingHelper<T>
) => {
	const baseSchema = BaseQuerySchema(sortingHelper);
	return z.preprocess(
		(data: any) => ({
			...baseSchema.parse(data)
		}),
		z.object({
			...baseSchema.innerType().shape
		})
	);
};

export const NewsletterDeleteQuerySchema = z.object({
	ids: validateString("Contact IDs")
		.optional()
		.transform(value => (value ? value.split(",") : []))
		.refine(values => values.length === 0 || values.every(val => !isNaN(Number(val))), {
			message: "Invalid Newsletter IDs"
		})
		.transform(values => values.map(Number))
});

export const ContactFormSchema = z.object({
	name: validateString("Name"),
	email: validateEmail,
	message: validateString("Message")
});

export const NewsletterFormSchema = z.object({
	email: validateEmail
});

export type ContactFormSchemaType = z.infer<typeof ContactFormSchema>;
export type NewsletterFormSchemaType = z.infer<typeof NewsletterFormSchema>;
export type ContactQuerySchemaType = z.infer<ReturnType<typeof ContactQuerySchema>>;
export type NewsletterQuerySchemaType = z.infer<ReturnType<typeof NewsletterQuerySchema>>;
