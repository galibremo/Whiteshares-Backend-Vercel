import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { z } from "zod";

import { SortingHelper } from "@/core/sortingHelper";
import { BaseQuerySchema } from "@/validators/baseQuery.schema";

export const WalletQuerySchema = <T extends PgTableWithColumns<any>>(
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

export type WalletQuerySchemaType = z.infer<ReturnType<typeof WalletQuerySchema>>;
