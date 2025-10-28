import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	json,
	pgEnum,
	pgTable,
	serial,
	text,
	varchar
} from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";
import { MEDIA_LIST, STORAGE_PROVIDER_LIST } from "@/databases/drizzle/lists";
import { portfolioGalleryImages, portfolios } from "@/models/drizzle/portfolio.model";

// Enums
export const MEDIA_TYPE = pgEnum("media_type", MEDIA_LIST.enumValues);
export const STORAGE_PROVIDER_TYPE = pgEnum("storage_provider", STORAGE_PROVIDER_LIST.enumValues);

// Media Library - Main Table
export const mediaLibrary = pgTable("media_library", {
	id: serial("id").primaryKey(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size").notNull(), // in bytes
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	mediaType: MEDIA_TYPE("media_type").notNull(),

	// Storage information
	provider: STORAGE_PROVIDER_TYPE("storage_provider").notNull(),
	storageId: text("storage_id").notNull(), // ID given by the storage provider
	url: text("url").notNull(), // Public URL
	secureUrl: text("secure_url"), // HTTPS URL if available

	// Additional storage metadata
	storageMetadata: json("storage_metadata"), // Provider-specific metadata

	// Media properties
	width: integer("width"), // For images and videos
	height: integer("height"), // For images and videos
	duration: integer("duration"), // For videos and audio (in seconds)

	// Status
	isPublic: boolean("is_public").default(true),
	isFeatured: boolean("is_featured").default(false),

	...timestamps
});

// Relationships
export const mediaLibraryRelations = relations(mediaLibrary, ({ many }) => ({
	// References from portfolio entities for featured images (one-to-many)
	portfoliosAsFeaturedImage: many(portfolios, {
		relationName: "featuredImage"
	}),

	// References from gallery images junction table (one-to-many)
	portfolioGalleryImages: many(portfolioGalleryImages, {
		relationName: "galleryImages"
	})
}));
