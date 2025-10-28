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
import { DATA_ROOM_LIST, STORAGE_PROVIDER_LIST } from "@/databases/drizzle/lists";

// Enums
export const DATA_ROOM_TYPE = pgEnum("data_room_type", DATA_ROOM_LIST.enumValues);
export const STORAGE_PROVIDER_TYPE = pgEnum("storage_provider", STORAGE_PROVIDER_LIST.enumValues);

// Data Room - Main Table
export const dataRoom = pgTable("data_room", {
	id: serial("id").primaryKey(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size").notNull(), // in bytes
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	documentType: DATA_ROOM_TYPE("document_type").notNull(),

	// Storage information
	provider: STORAGE_PROVIDER_TYPE("storage_provider").notNull(),
	storageId: text("storage_id").notNull(), // ID given by the storage provider
	url: text("url").notNull(), // Public URL
	secureUrl: text("secure_url"), // HTTPS URL if available

	// Additional storage metadata
	storageMetadata: json("storage_metadata"), // Provider-specific metadata

	// Document properties
	pageCount: integer("page_count"), // For PDF documents
	wordCount: integer("word_count"), // For text documents
	duration: integer("duration"), // For audio/video documents (in seconds)

	// Status
	isPublic: boolean("is_public").default(true),
	isFeatured: boolean("is_featured").default(false),
	isArchived: boolean("is_archived").default(false),

	// Additional metadata
	description: text("description"),
	tags: json("tags"), // Array of tags for categorization
	version: varchar("version", { length: 50 }).default("1.0"),

	...timestamps
});
