import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'lost' | 'found'
  description: text("description").notNull(),
  location: text("location").notNull(),
  dateReported: timestamp("date_reported").defaultNow().notNull(),
  dateLost: timestamp("date_lost"), // When it was lost
  dateFound: timestamp("date_found"), // When it was found
  status: text("status").notNull().default("reported"), // 'reported', 'retrieved', 'donated', 'claimed'
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  imageUrl: text("image_url"),
  claimedBy: text("claimed_by"), // New field to track who claimed the item
});

export const insertItemSchema = createInsertSchema(items).omit({ 
  id: true, 
  dateReported: true,
  status: true 
}).extend({
  dateLost: z.string().optional().nullable(),
  dateFound: z.string().optional().nullable(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export const LOCATIONS = [
  "Classroom", 
  "Cafeteria", 
  "Gym", 
  "Library", 
  "Hallway", 
  "Field", 
  "Bus", 
  "SLC", 
  "Pool Patio", 
  "North Quad", 
  "South Quad", 
  "PAV", 
  "Other"
] as const;
