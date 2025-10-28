import { relations } from "drizzle-orm";
import { doublePrecision, integer, pgTable, serial } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { users } from "@/models/drizzle/authentication.model";
import { portfolios } from "@/models/drizzle/portfolio.model";

export const portfolioDividend = pgTable("portfolio_dividend", {
	id: serial("id").primaryKey(),
	portfolioId: integer("portfolio_id")
		.references(() => portfolios.id, { onDelete: "restrict" })
		.notNull(),
	netRentalIncome: doublePrecision("net_rental_income").notNull(),
	expenses: doublePrecision("expenses").notNull(),
	totalRevenue: doublePrecision("total_revenue").notNull(),
	...timestamps
});

export const userDividend = pgTable("user_dividend", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.references(() => users.id, { onDelete: "restrict" })
		.notNull(),
	portfolioId: integer("portfolio_id")
		.references(() => portfolios.id, { onDelete: "restrict" })
		.notNull(),
	totalShares: integer("total_shares").notNull(),
	dividend: doublePrecision("dividend").notNull(),
	...timestamps
});

// Relationships
export const portfolioDividendRelations = relations(portfolioDividend, ({ one }) => ({
	portfolio: one(portfolios, {
		fields: [portfolioDividend.portfolioId],
		references: [portfolios.id]
	})
}));

export const userDividendRelations = relations(userDividend, ({ one }) => ({
	user: one(users, {
		fields: [userDividend.userId],
		references: [users.id]
	}),
	portfolio: one(portfolios, {
		fields: [userDividend.portfolioId],
		references: [portfolios.id]
	})
}));
