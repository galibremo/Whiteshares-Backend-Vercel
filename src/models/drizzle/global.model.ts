import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

import { timestamps } from "@/databases/drizzle/helpers";

export const contact = pgTable("contact", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 256 }).notNull(),
	email: varchar("email", { length: 256 }).notNull(),
	message: text("message").notNull(),
	...timestamps
});

export const newsletter = pgTable("newsletter", {
	id: serial("id").primaryKey(),
	email: varchar("email", { length: 256 }).notNull(),
	...timestamps
});
