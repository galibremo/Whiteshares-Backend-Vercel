import { relations } from "drizzle-orm";
import { doublePrecision, integer, pgEnum, pgTable, serial } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { BALANCE_TYPE } from "@/databases/drizzle/lists";
import { users } from "@/models/drizzle/authentication.model";

export const BALANCE_ENUM = pgEnum("balance_type", BALANCE_TYPE.enumValues);

export const wallet = pgTable("wallet", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.references(() => users.id, { onDelete: "restrict" })
		.notNull(),
	amount: doublePrecision("amount").notNull(),
	remainingAmount: doublePrecision("remaining_amount").notNull(),
	balanceType: BALANCE_ENUM("balance_type"),
	...timestamps
});

export const walletRelations = relations(wallet, ({ one }) => ({
	user: one(users, {
		fields: [wallet.userId],
		references: [users.id]
	})
}));
