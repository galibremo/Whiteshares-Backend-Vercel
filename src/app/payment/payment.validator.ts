import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { z } from "zod";

import { zodMessages } from "@/core/messages";
import { SortingHelper } from "@/core/sortingHelper";
import { PAYMENT_METHOD_TYPE, PAYMENT_STATUS } from "@/databases/drizzle/lists";
import { BaseQuerySchema } from "@/validators/baseQuery.schema";
import { validateEnum, validateString } from "@/validators/commonRules";

export const PaymentPortfolioQuerySchema = <T extends PgTableWithColumns<any>>(
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

export const PaymentTransactionsQuerySchema = <T extends PgTableWithColumns<any>>(
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

export const AdminPaymentTransactionsQuerySchema = <T extends PgTableWithColumns<any>>(
	sortingHelper: SortingHelper<T>
) => {
	const baseSchema = BaseQuerySchema(sortingHelper);

	return z.preprocess(
		(data: any) => ({
			...baseSchema.parse(data),
			userIdQuery: data.userIdQuery ? String(data.userIdQuery).split(",") : undefined,
			portfolioIdQuery: data.portfolioIdQuery
				? String(data.portfolioIdQuery).split(",")
				: undefined,
			paymentMethodQuery: data.paymentMethodQuery
				? String(data.paymentMethodQuery).split(",")
				: undefined,
			paymentStatusQuery: data.paymentStatusQuery
				? String(data.paymentStatusQuery).split(",")
				: undefined
		}),
		z.object({
			...baseSchema.innerType().shape,
			userIdQuery: z
				.array(
					validateString("User ID Query").refine(
						value => !isNaN(Number(value)),
						zodMessages.error.invalid.invalidNumber("User ID Query")
					)
				)
				.transform(value => value.map(Number))
				.optional(),
			portfolioIdQuery: z
				.array(
					validateString("Portfolio ID Query").refine(
						value => !isNaN(Number(value)),
						zodMessages.error.invalid.invalidNumber("Portfolio ID Query")
					)
				)
				.transform(value => value.map(Number))
				.optional(),
			paymentMethodQuery: z
				.array(validateEnum("Payment Method Query", PAYMENT_METHOD_TYPE.enumValues))
				.optional()
				.refine(
					array => !array || array.every(s => PAYMENT_METHOD_TYPE.enumValues.includes(s)),
					zodMessages.error.invalid.invalidEnum(
						"Payment Method Query",
						PAYMENT_METHOD_TYPE.enumValues
					)
				),
			paymentStatusQuery: z
				.array(validateEnum("Payment Status Query", PAYMENT_STATUS.enumValues))
				.optional()
				.refine(
					array => !array || array.every(s => PAYMENT_STATUS.enumValues.includes(s)),
					zodMessages.error.invalid.invalidEnum("Payment Status Query", PAYMENT_STATUS.enumValues)
				)
		})
	);
};

export type PaymentPortfolioQuerySchemaType = z.infer<
	ReturnType<typeof PaymentPortfolioQuerySchema>
>;
export type PaymentTransactionsQuerySchemaType = z.infer<
	ReturnType<typeof PaymentTransactionsQuerySchema>
>;
export type AdminPaymentTransactionsQuerySchemaType = z.infer<
	ReturnType<typeof AdminPaymentTransactionsQuerySchema>
>;
