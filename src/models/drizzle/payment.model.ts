import { relations } from "drizzle-orm";
import {
	doublePrecision,
	integer,
	json,
	pgEnum,
	pgTable,
	serial,
	text,
	varchar
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { PAYMENT_METHOD_TYPE, PAYMENT_STATUS } from "@/databases/drizzle/lists";
import { users } from "@/models/drizzle/authentication.model";
import { portfolios } from "@/models/drizzle/portfolio.model";

// Payment method types enum
export const paymentMethodTypeEnum = pgEnum("payment_method_type", PAYMENT_METHOD_TYPE.enumValues);

// Payment status enum
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUS.enumValues);

// Payments table
export const payments = pgTable("payments", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	transactionId: text("transaction_id"),
	type: paymentMethodTypeEnum("type").notNull(),
	portfolioId: integer("portfolio_id").references(() => portfolios.id, { onDelete: "set null" }),
	status: paymentStatusEnum("status").notNull(),
	amount: doublePrecision("amount").notNull(),
	fee: doublePrecision("fee").default(0),
	netAmount: doublePrecision("net_amount"),
	currency: varchar("currency", { length: 3 }).default("USD"),
	description: text("description"),
	investedShares: integer("invested_shares").notNull().default(0),
	metadata: json("metadata").default({}),
	errorMessage: text("error_message"),
	...timestamps
});

// Relationships
export const paymentsRelations = relations(payments, ({ one }) => ({
	portfolio: one(portfolios, {
		fields: [payments.portfolioId],
		references: [portfolios.id]
	}),
	user: one(users, {
		fields: [payments.userId],
		references: [users.id]
	})
}));
