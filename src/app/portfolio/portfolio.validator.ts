import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { z } from "zod";

import { zodMessages } from "@/core/messages";
import { SortingHelper } from "@/core/sortingHelper";
import { BaseQuerySchema } from "@/validators/baseQuery.schema";
import { validatePositiveNumber, validateString } from "@/validators/commonRules";

export const PortfolioQuerySchema = <T extends PgTableWithColumns<any>>(
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

export const PortfolioDeleteQuerySchema = z.object({
	ids: validateString("Portfolio IDs")
		.optional()
		.transform(value => (value ? value.split(",") : []))
		.refine(
			values => values.length === 0 || values.every(val => !isNaN(Number(val))),
			zodMessages.error.invalid.invalidNumber("Portfolio IDs")
		)
		.transform(values => values.map(Number))
});

export const PortfolioCreateSchema = z.object({
	title: validateString("Portfolio title"),
	slug: validateString("Portfolio slug"),
	description: validateString("Portfolio description"),
	featuredImageId: validatePositiveNumber("Portfolio featured image ID"),
	galleryImages: z
		.array(validatePositiveNumber("Portfolio gallery images"), {
			required_error: "Portfolio gallery images are required"
		})
		.optional(),
	price: validatePositiveNumber("Portfolio price"),
	shares: validatePositiveNumber("Portfolio shares"),
	sharePrice: validatePositiveNumber("Portfolio share price")
});

export type PortfolioCreateSchemaType = z.infer<typeof PortfolioCreateSchema>;
export type PortfolioQuerySchemaType = z.infer<ReturnType<typeof PortfolioQuerySchema>>;
