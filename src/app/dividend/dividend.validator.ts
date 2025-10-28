import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { z } from "zod";

import { SortingHelper } from "@/core/sortingHelper";
import { BaseQuerySchema } from "@/validators/baseQuery.schema";
import { validatePositiveNumber } from "@/validators/commonRules";

export const DividendQuerySchema = <T extends PgTableWithColumns<any>>(
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

export const PortfolioDividendCreateSchema = z.object({
	portfolioId: validatePositiveNumber("Portfolio ID"),
	netRentalIncome: validatePositiveNumber("Net Rental Income"),
	expenses: validatePositiveNumber("Expenses")
});

export const UserDividendCreateSchema = z.object({
	portfolioId: validatePositiveNumber("Portfolio ID"),
	totalShares: validatePositiveNumber("Total Shares"),
	dividend: validatePositiveNumber("Dividend")
});

export type DividendQuerySchemaType = z.infer<ReturnType<typeof DividendQuerySchema>>;
