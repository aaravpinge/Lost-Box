diff --git a/shared/schema.ts b/shared/schema.ts
index 0000000..0000000 100644
--- a/shared/schema.ts
+++ b/shared/schema.ts
@@
-import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
+import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
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
-  status: text("status").notNull().default("reported"), // 'reported', 'retrieved', 'donated', 'claimed'
+  // Use pending_verification as the default for new reports
+  status: text("status").notNull().default("pending_verification"),
   contactName: text("contact_name").notNull(),
   contactEmail: text("contact_email").notNull(),
   imageUrl: text("image_url"),
   claimedBy: text("claimed_by"), // New field to track who claimed the item
   category: text("category").notNull().default("Other"),
+  // New fields to support verification workflow
+  publicFields: text("public_fields"),
+  privateFields: text("private_fields"),
+  schoolId: text("school_id"),
 });
@@
 export const insertItemSchema = createInsertSchema(items).omit({
   id: true,
   dateReported: true,
   status: true
 }).extend({
@@
   imageUrl: z.string().optional().nullable(),
+  publicFields: z.any().optional(),
+  privateFields: z.any().optional(),
 }).refine((data) => {
   if (data.type === "lost") return !!data.dateLost && data.dateLost.length > 0;
   if (data.type === "found") return !!data.dateFound && data.dateFound.length > 0;
   return true;
 }, (data) => ({
   message: "Date is required",
   path: [data.type === "lost" ? "dateLost" : "dateFound"]
 }));
+
+// Sanitize privateFields to avoid sensitive PII
+insertItemSchema.superRefine((data, ctx) => {
+  const forbiddenPatterns = [/password/i, /addr(ess)?/i, /ssn/i, /social ?security/i];
+  try {
+    const jsonString = JSON.stringify(data.privateFields || {});
+    for (const p of forbiddenPatterns) {
+      if (p.test(jsonString)) {
+        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Private verification details must not include passwords, home addresses, or other sensitive personal data." });
+        break;
+      }
+    }
+  } catch (e) {
+    // ignore
+  }
+});
@@
 export type Item = typeof items.$inferSelect;
 export type InsertItem = z.infer<typeof insertItemSchema>;
+
+export const claims = pgTable("claims", {
+  id: serial("id").primaryKey(),
+  item_id: text("item_id"),
+  claimant_name: text("claimant_name"),
+  claimant_email: text("claimant_email"),
+  claimed_details: text("claimed_details"),
+  match_score: text("match_score"),
+  status: text("status"),
+  created_at: timestamp("created_at"),
+  reviewed_at: timestamp("reviewed_at"),
+  reviewer: text("reviewer"),
+  notes: text("notes")
+});
