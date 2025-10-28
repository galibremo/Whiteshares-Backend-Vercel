import { relations } from "drizzle-orm";
import { integer, json, pgTable, serial } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "@/models/drizzle/authentication.model";
import { paypalTransactions } from "@/models/drizzle/paypal.model";
import { plaidBanks, plaidTransactions } from "@/models/drizzle/plaid.model";
import { portfolios } from "@/models/drizzle/portfolio.model";

export const cart = pgTable("cart", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	portfolioId: integer("portfolio_id")
		.references(() => portfolios.id, { onDelete: "cascade" })
		.notNull(),
	shares: integer("shares").notNull(),
	bankAccountId: integer("bank_account_id").references(() => plaidBanks.id, {
		onDelete: "set null"
	}),
	bankAccountDetails: json("bank_account_details"),
	...timestamps
});

export const checkout = pgTable("checkout", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "restrict" }),
	portfolioId: integer("portfolio_id").references(() => portfolios.id, { onDelete: "set null" }),
	portfolioDetails: json("portfolio_details"),
	shares: integer("shares").notNull(),
	bankAccountId: integer("bank_account_id").references(() => plaidBanks.id, {
		onDelete: "set null"
	}),
	bankAccountDetails: json("bank_account_details"),
	plaidTransactionId: integer("plaid_transaction_id").references(() => plaidTransactions.id, {
		onDelete: "restrict"
	}),
	paypalTransactionId: integer("paypal_transaction_id").references(() => paypalTransactions.id, {
		onDelete: "restrict"
	}),
	...timestamps
});

// Relationships
export const cartRelations = relations(cart, ({ one }) => ({
	plaidBank: one(plaidBanks, {
		fields: [cart.bankAccountId],
		references: [plaidBanks.id]
	}),
	portfolio: one(portfolios, {
		fields: [cart.portfolioId],
		references: [portfolios.id]
	}),
	user: one(users, {
		fields: [cart.userId],
		references: [users.id]
	})
}));

export const checkoutRelations = relations(checkout, ({ one }) => ({
	plaidBank: one(plaidBanks, {
		fields: [checkout.bankAccountId],
		references: [plaidBanks.id]
	}),
	paypalTransaction: one(paypalTransactions, {
		fields: [checkout.paypalTransactionId],
		references: [paypalTransactions.id]
	}),
	plaidTransaction: one(plaidTransactions, {
		fields: [checkout.plaidTransactionId],
		references: [plaidTransactions.id]
	}),
	portfolio: one(portfolios, {
		fields: [checkout.portfolioId],
		references: [portfolios.id]
	}),
	user: one(users, {
		fields: [checkout.userId],
		references: [users.id]
	})
}));
