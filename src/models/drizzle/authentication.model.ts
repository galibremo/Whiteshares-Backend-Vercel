import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	json,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { ROLE_LIST, TOKEN_LIST } from "@/databases/drizzle/lists";
import { userDividend } from "@/models/drizzle/dividend.model";
import { cart, checkout } from "@/models/drizzle/order.model";
import { payments } from "@/models/drizzle/payment.model";
import { paypalTransactions } from "@/models/drizzle/paypal.model";
import { plaidBanks, plaidProfile, plaidTransactions } from "@/models/drizzle/plaid.model";
import { investments, portfolios } from "@/models/drizzle/portfolio.model";
import { wallet } from "@/models/drizzle/wallet.model";

export const ROLE_TYPE = pgEnum("role_type", ROLE_LIST.enumValues);

export const TOKEN_TYPE = pgEnum("token_type", TOKEN_LIST.enumValues);

export const users = pgTable("user", {
	id: serial("id").primaryKey(),
	name: text("name"),
	username: text("username").unique(),
	email: text("email").unique(),
	password: text("password"),
	emailVerified: timestamp("email_verified", { withTimezone: true }),
	image: text("image"),
	role: ROLE_TYPE("role").notNull().default("INVESTOR"),
	...timestamps
});

export const accounts = pgTable("account", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	provider: text("provider").notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text("scope"),
	idToken: text("id_token"),
	sessionState: text("session_state"),
	...timestamps
});

export const profile = pgTable("profile", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" })
		.unique(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	address: text("address"),
	city: text("city"),
	state: text("state"),
	country: text("country"),
	zipCode: text("zip_code"),
	dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
	phoneNumber: text("phone_number"),
	...timestamps
});

export const sessions = pgTable("session", {
	id: serial("id").primaryKey(),
	sessionId: text("session_id").notNull().unique(),
	sessionCookie: text("session_cookie").unique(),
	userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
	expires: timestamp("expires", { withTimezone: true }).notNull(),
	...timestamps
});

export const verificationToken = pgTable(
	"verification_token",
	{
		id: serial("id").primaryKey(),
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		tokenType: TOKEN_TYPE("token_type").notNull(),
		expires: timestamp("expires", { withTimezone: true }).notNull(),
		...timestamps
	},
	table => ({
		identifierTypeIdx: uniqueIndex("identifier_type_idx").on(table.identifier, table.tokenType)
	})
);

export const onboardingData = pgTable("onboarding_data", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	complete: boolean("complete").notNull(),
	accreditationStatus: boolean("accreditation_status").notNull(),
	onboardingJsonData: json("onboarding_json_data").default({}),
	currentStep: integer("current_step").default(1),
	...timestamps
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
	payments: many(payments),
	investments: many(investments),
	onboardingData: many(onboardingData),
	portfolios: many(portfolios),
	plaidProfiles: many(plaidProfile),
	paypalTransactions: many(paypalTransactions),
	sessions: many(sessions),
	plaidBanks: many(plaidBanks),
	plaidTransactions: many(plaidTransactions),
	profiles: many(profile),
	carts: many(cart),
	checkouts: many(checkout),
	accounts: many(accounts),
	userDividends: many(userDividend),
	wallets: many(wallet)
}));

export const accountRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	})
}));

export const profileRelations = relations(profile, ({ one }) => ({
	user: one(users, {
		fields: [profile.userId],
		references: [users.id]
	})
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const verificationTokenRelations = relations(verificationToken, ({ one }) => ({
	user: one(users, {
		fields: [verificationToken.identifier],
		references: [users.email]
	})
}));

export const onboardingDataRelations = relations(onboardingData, ({ one }) => ({
	user: one(users, {
		fields: [onboardingData.userId],
		references: [users.id]
	})
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));
