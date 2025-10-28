import { relations } from "drizzle-orm";
import {
	doublePrecision,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	varchar
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { CATEGORY_LIST } from "@/databases/drizzle/lists";
import { users } from "@/models/drizzle/authentication.model";
import { portfolioDividend, userDividend } from "@/models/drizzle/dividend.model";
import { mediaLibrary } from "@/models/drizzle/media.model";
import { cart, checkout } from "@/models/drizzle/order.model";
import { payments } from "@/models/drizzle/payment.model";
import { paypalTransactions } from "@/models/drizzle/paypal.model";
import { plaidTransactions } from "@/models/drizzle/plaid.model";

export const CATEGORY_TYPE = pgEnum("category_type", CATEGORY_LIST.enumValues);

export const portfolios = pgTable("portfolios", {
	id: serial("id").primaryKey(),
	title: varchar("title", { length: 255 }).notNull(),
	slug: varchar("slug", { length: 255 }).notNull().unique(),
	description: text("description").notNull(),
	featuredImageId: integer("featured_image_id").references(() => mediaLibrary.id),
	price: doublePrecision("price").notNull(),
	shares: integer("shares").notNull(),
	sharePrice: doublePrecision("share_price").notNull(),
	remainingShares: integer("remaining_shares").notNull(),
	remainingInvestment: doublePrecision("remaining_investment").notNull(),
	authorId: integer("author_id").references(() => users.id),
	...timestamps
});

// Junction table for portfolio gallery images (many-to-many)
export const portfolioGalleryImages = pgTable(
	"portfolio_gallery_images",
	{
		portfolioId: integer("portfolio_id")
			.notNull()
			.references(() => portfolios.id, { onDelete: "cascade" }),
		mediaId: integer("media_id")
			.notNull()
			.references(() => mediaLibrary.id, { onDelete: "cascade" }),
		displayOrder: integer("display_order").notNull().default(0),
		...timestamps
	},
	table => ({ pk: primaryKey({ columns: [table.portfolioId, table.mediaId] }) })
);

export const investments = pgTable("investments", {
	id: serial("id").primaryKey(),
	investorId: integer("investor_id")
		.notNull()
		.references(() => users.id),
	portfolioId: integer("portfolio_id")
		.references(() => portfolios.id, { onDelete: "cascade" })
		.notNull(),
	shares: integer("shares").notNull(),
	sharePrice: doublePrecision("share_price").notNull(),
	totalInvestment: doublePrecision("total_investment").notNull(),
	...timestamps
});

// Relationships
export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
	// One-to-One relationships
	featuredImage: one(mediaLibrary, {
		fields: [portfolios.featuredImageId],
		references: [mediaLibrary.id],
		relationName: "featuredImage"
	}),
	author: one(users, {
		fields: [portfolios.authorId],
		references: [users.id]
	}),

	// One-to-Many relationships
	payments: many(payments),
	investments: many(investments),
	portfolioDividends: many(portfolioDividend),
	paypalTransactions: many(paypalTransactions),
	plaidTransactions: many(plaidTransactions),
	carts: many(cart),
	checkouts: many(checkout),
	userDividends: many(userDividend),

	// Many-to-Many relationships (via junction tables)
	galleryImages: many(portfolioGalleryImages, {
		relationName: "portfolioGalleryImages"
	})
}));

export const investmentsRelations = relations(investments, ({ one }) => ({
	user: one(users, {
		fields: [investments.investorId],
		references: [users.id]
	}),
	portfolio: one(portfolios, {
		fields: [investments.portfolioId],
		references: [portfolios.id]
	})
}));

// Relations for the junction table
export const portfolioGalleryImagesRelations = relations(portfolioGalleryImages, ({ one }) => ({
	portfolio: one(portfolios, {
		fields: [portfolioGalleryImages.portfolioId],
		references: [portfolios.id],
		relationName: "portfolioGalleryImages"
	}),
	media: one(mediaLibrary, {
		fields: [portfolioGalleryImages.mediaId],
		references: [mediaLibrary.id],
		relationName: "galleryImages"
	})
}));
