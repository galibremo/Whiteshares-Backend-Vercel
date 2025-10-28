import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { z } from "zod";

import { zodMessages } from "@/core/messages";
import { SortingHelper } from "@/core/sortingHelper";
import { BaseQuerySchema } from "@/validators/baseQuery.schema";
import { validateString } from "@/validators/commonRules";

const plaidProducts = ["IDENTITY_VERIFICATION", "AUTH"] as const;

export const PlaidBankQuerySchema = <T extends PgTableWithColumns<any>>(
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

export const PlaidBankDeleteQuerySchema = z.object({
	ids: validateString("PlaidBank IDs")
		.optional()
		.transform(value => (value ? value.split(",") : []))
		.refine(
			values => values.length === 0 || values.every(val => !isNaN(Number(val))),
			zodMessages.error.invalid.invalidNumber("PlaidBank IDs")
		)
		.transform(values => values.map(Number))
});

export const GenerateLinkSchema = z.object({
	product: z.enum(plaidProducts, {
		message: `Products has to be one of these ${plaidProducts.join(" ")}`
	})
});

export const PlaidBankFormSchema = z.object({
	bankName: validateString("Bank name"),
	bankType: validateString("Bank type"),
	accountId: validateString("Account ID"),
	publicToken: validateString("Public token"),
	bankData: z.any()
});

export type PlaidBankQuerySchemaType = z.infer<ReturnType<typeof PlaidBankQuerySchema>>;
