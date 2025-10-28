import { relations } from "drizzle-orm";
import {
	boolean,
	decimal,
	integer,
	json,
	pgTable,
	serial,
	text,
	varchar
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "@/models/drizzle/authentication.model";
import { cart, checkout } from "@/models/drizzle/order.model";
import { portfolios } from "@/models/drizzle/portfolio.model";

/**
 * Plaid Transactions
 * All transactions from Plaid API will be stored here
 */
export const plaidTransactions = pgTable("plaid_transactions", {
	id: serial().primaryKey(),
	transactionId: text("transaction_id"),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	achClass: varchar("ach_class", { length: 3 }),
	amount: decimal("amount", { precision: 10, scale: 2 }),
	share: integer("share").default(0),
	authorizationDecision: varchar("authorization_decision", { length: 10 }),
	authorizationDecisionRationale: json("authorization_decision_rationale").default({}),
	description: varchar("description", { length: 50 }),
	failureReason: text("failure_reason"),
	fundingAccountId: text("funding_account_id"),
	guaranteeDecision: varchar("guarantee_decision", { length: 10 }),
	guaranteeDecisionRationale: text("guarantee_decision_rationale"),
	isoCurrencyCode: varchar("iso_currency_code", { length: 3 }), // ISO code like USD
	mode: varchar("mode", { length: 20 }),
	network: varchar("network", { length: 20 }),
	originationAccountId: text("origination_account_id"),
	status: varchar("status", { length: 20 }),
	transferId: text("transfer_id"),
	metadata: json("metadata").default({}),
	portfolioId: integer("portfolio_id").references(() => portfolios.id, { onDelete: "set null" }),
	transactionDetails: json("transaction_details").default({}),
	...timestamps
});

/**
 * Plaid Banks
 * All banks connected to Plaid API will be stored here
 */
export const plaidBanks = pgTable("plaid_banks", {
	id: serial("id").primaryKey(),
	accountId: text("account_id").notNull().unique(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	bankName: text("bank_name").notNull(),
	bankType: text("bank_type").notNull(),
	accessToken: text("access_token").notNull(),
	bankData: json("bank_data").default({}),
	...timestamps
});

/**
 * Plaid Profile
 * All profiles connected to Plaid API will be stored here
 */
export const plaidProfile = pgTable("plaid_profile", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	is_verified: boolean("is_verified").default(false),
	idv_status: text("idv_status").notNull(),
	most_recent_idv_session: text("most_recent_idv_session"),
	plaidProfileData: json("plaid_profile_data").default({}),
	...timestamps
});

// Relationships
export const plaidTransactionsRelations = relations(plaidTransactions, ({ one, many }) => ({
	portfolio: one(portfolios, {
		fields: [plaidTransactions.portfolioId],
		references: [portfolios.id]
	}),
	user: one(users, {
		fields: [plaidTransactions.userId],
		references: [users.id]
	}),
	checkouts: many(checkout)
}));

export const plaidBanksRelations = relations(plaidBanks, ({ one, many }) => ({
	user: one(users, {
		fields: [plaidBanks.userId],
		references: [users.id]
	}),
	carts: many(cart),
	checkouts: many(checkout)
}));

export const plaidProfileRelations = relations(plaidProfile, ({ one }) => ({
	user: one(users, {
		fields: [plaidProfile.userId],
		references: [users.id]
	})
}));
