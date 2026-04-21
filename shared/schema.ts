import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth.js";

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'lost' | 'found'
  description: text("description").notNull(),
  additionalDetails: text("additional_details"),
  location: text("location").notNull(),
  dateReported: timestamp("date_reported").defaultNow().notNull(),
  dateLost: timestamp("date_lost"), // When it was lost
  dateFound: timestamp("date_found"), // When it was found
  status: text("status").notNull().default("reported"), // 'reported', 'retrieved', 'donated', 'claimed'
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  imageUrl: text("image_url"),
  claimedBy: text("claimed_by"), // New field to track who claimed the item
  category: text("category").notNull().default("Other"),
});

export const CATEGORIES = ["Electronics", "Clothing", "Water Bottles", "Keys", "Books", "Other"] as const;

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  dateReported: true,
  status: true
}).extend({
  description: z.string().min(1, "Description is required"),
  additionalDetails: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required"),
  contactName: z.string().min(1, "Name is required"),
  contactEmail: z.string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .refine((email) => email.toLowerCase().endsWith("@bwscampus.com"), {
      message: "You must use your official @bwscampus.com email address to report an item"
    }),
  dateLost: z.string().optional().nullable(),
  dateFound: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
}).refine((data) => {
  if (data.type === "lost") return !!data.dateLost && data.dateLost.length > 0;
  if (data.type === "found") return !!data.dateFound && data.dateFound.length > 0;
  return true;
}, (data) => ({
  message: "Date is required",
  path: [data.type === "lost" ? "dateLost" : "dateFound"]
}));

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
