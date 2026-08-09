import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
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
  // Use pending_verification as the default for new reports
  status: text("status").notNull().default("pending_verification"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  imageUrl: text("image_url"),
  claimedBy: text("claimed_by"), // New field to track who claimed the item
  category: text("category").notNull().default("Other"),
  // New fields to support verification workflow
  publicFields: text("public_fields"),
  privateFields: text("private_fields"),
  schoolId: text("school_id"),
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
    .refine((email) => {
      const lower = email.toLowerCase();
      return lower.endsWith("@stu.birminghamcharter.com") || lower.endsWith("@bcchs.net");
    }, {
      message: "You must use an official campus email (@stu.birminghamcharter.com or @bcchs.net) to report an item"
    }),
  dateLost: z.string().optional().nullable(),
  dateFound: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  publicFields: z.any().optional(),
  privateFields: z.any().optional(),
}).refine((data) => {
  if (data.type === "lost") return !!data.dateLost && data.dateLost.length > 0;
  if (data.type === "found") return !!data.dateFound && data.dateFound.length > 0;
  return true;
}, (data) => ({
  message: "Date is required",
  path: [data.type === "lost" ? "dateLost" : "dateFound"]
}));

// Sanitize privateFields to avoid sensitive PII
insertItemSchema.superRefine((data, ctx) => {
  const forbiddenPatterns = [/password/i, /addr(ess)?/i, /ssn/i, /social ?security/i];
  try {
    const jsonString = JSON.stringify(data.privateFields || {});
    for (const p of forbiddenPatterns) {
      if (p.test(jsonString)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Private verification details must not include passwords, home addresses, or other sensitive personal data." });
        break;
      }
    }
  } catch (e) {
    // ignore
  }
});

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  item_id: integer("item_id").notNull(),
  claimant_name: text("claimant_name"),
  claimant_email: text("claimant_email"),
  claimed_details: text("claimed_details"),
  match_score: integer("match_score"),
  status: text("status"),
  created_at: timestamp("created_at"),
  reviewed_at: timestamp("reviewed_at"),
  reviewer: text("reviewer"),
  notes: text("notes")
});
