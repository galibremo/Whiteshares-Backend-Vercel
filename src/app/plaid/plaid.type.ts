import { PlaidTransactionSchemaType } from "@/databases/drizzle/types";

export type CreatePlaidTransaction = Omit<
	PlaidTransactionSchemaType,
	"id" | "createdAt" | "updatedAt"
>;
export type BuyingPortfolio = {
	portfolio: {
		image: string | undefined;
		title: string;
	};
	investment: string;
	shares: number;
	amount: number;
	action: string;
};
