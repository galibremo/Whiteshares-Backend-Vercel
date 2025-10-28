import { relations } from "drizzle-orm";
import { integer, json, pgTable, serial, text } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "@/models/drizzle/authentication.model";
import { portfolios } from "@/models/drizzle/portfolio.model";

export const paypalTransactions = pgTable("paypal_transactions", {
	id: serial("id").primaryKey(),
	transactionId: text("transaction_id").notNull().unique(),
	payerId: text("payer_id").notNull(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	grossAmount: text("gross_amount").notNull(),
	paypalFee: text("paypal_fee").notNull(),
	netAmount: text("net_amount").notNull(),
	currency: text("currency").notNull(),
	portfolioId: integer("portfolio_id").references(() => portfolios.id, { onDelete: "set null" }),
	transactionDetails: json("transaction_details").default({}),
	...timestamps
});

// Relationships
export const paypalTransactionsRelations = relations(paypalTransactions, ({ one }) => ({
	user: one(users, {
		fields: [paypalTransactions.userId],
		references: [users.id]
	}),
	portfolio: one(portfolios, {
		fields: [paypalTransactions.portfolioId],
		references: [portfolios.id]
	})
}));
