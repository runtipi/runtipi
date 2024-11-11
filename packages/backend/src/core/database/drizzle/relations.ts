import { relations } from "drizzle-orm/relations";
import { user, link } from "./schema";

export const linkRelations = relations(link, ({one}) => ({
	user: one(user, {
		fields: [link.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	links: many(link),
}));