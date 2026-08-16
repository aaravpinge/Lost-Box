```ts
import { db } from "./db.js";
import {
  items,
  claims,
  users,
  type Item,
  type InsertItem,
  type User,
  type UpsertUser as InsertUser,
} from "../../shared/schema.js";
import { eq, desc, or, and, ilike, lt } from "drizzle-orm";
import { preparePrivateFields } from "./crypto.js";

export interface IStorage {
  getItems(type?: string, search?: string): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItemStatus(
    id: number,
    status: string,
    claimedBy?: string
  ): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;

  // Auth methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  findPotentialMatches(item: Item): Promise<Item[]>;
  getStats(): Promise<{
    totalItems: number;
    lostItems: number;
    foundItems: number;
    claimedItems: number;
  }>;
  getExpiredItems(days?: number): Promise<Item[]>;

  // Claims
  getPendingClaims(): Promise<any[]>;
  createClaim(
    itemId: number,
    claimantName: string | undefined,
    claimantEmail: string | undefined,
    claimedDetails: any,
    matchScore?: number,
    status?: string
  ): Promise<any>;
  getClaimsForItem(itemId: number): Promise<any[]>;
  getClaimById(claimId: number): Promise<any | undefined>;
  reviewClaim(
    claimId: number,
    reviewer: string,
    action: "accept" | "reject",
    notes?: string,
    setStatus?: string
  ): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getItems(type?: string, search?: string): Promise<Item[]> {
    let query = db.select().from(items);

    const filters = [];

    if (type) {
      filters.push(eq(items.type, type));
    }

    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`;

      filters.push(
        or(
          ilike(items.description, searchPattern),
          ilike(items.location, searchPattern),
          ilike(items.category, searchPattern)
        )
      );
    }

    let rows;

    if (filters.length > 0) {
      // @ts-ignore - Drizzle where with multiple filters
      rows = await query
        .where(and(...filters))
        .orderBy(desc(items.dateReported));
    } else {
      rows = await query.orderBy(desc(items.dateReported));
    }

    // Redact private fields before returning to public callers
    return rows.map((r: any) => {
      const out = { ...r };

      if (out.publicFields) {
        try {
          out.publicFields = JSON.parse(out.publicFields);
        } catch (e) {
          out.publicFields = out.publicFields;
        }
      } else {
        out.publicFields = null;
      }

      // Never expose privateFields through public item listings.
      delete out.privateFields;

      return out;
    });
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, id));

    if (!item) {
      return undefined;
    }

    const out: any = { ...item };

    if (out.publicFields) {
      try {
        out.publicFields = JSON.parse(out.publicFields);
      } catch (e) {
        out.publicFields = out.publicFields;
      }
    } else {
      out.publicFields = null;
    }

    // Parse privateFields so the claim endpoint can use them.
    // Routes must redact this before returning the item publicly.
    if (out.privateFields) {
      try {
        out.privateFields = JSON.parse(out.privateFields);
      } catch (e) {
        out.privateFields = out.privateFields;
      }
    }

    return out;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const preparedPrivate = preparePrivateFields(
      (insertItem as any).privateFields
    );

    const formattedItem: any = {
      ...insertItem,
      dateLost: insertItem.dateLost
        ? new Date(insertItem.dateLost)
        : null,
      dateFound: insertItem.dateFound
        ? new Date(insertItem.dateFound)
        : null,
      publicFields: insertItem.publicFields
        ? JSON.stringify(insertItem.publicFields)
        : null,
      privateFields: preparedPrivate
        ? JSON.stringify(preparedPrivate)
        : null,
    };

    const [item] = await db
      .insert(items)
      .values(formattedItem as any)
      .returning();

    return item;
  }

  async updateItemStatus(
    id: number,
    status: string,
    claimedBy?: string
  ): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({
        status: status as any,
        claimedBy: claimedBy || null,
      })
      .where(eq(items.id, id))
      .returning();

    return item;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();

    return user;
  }

  async updateUser(
    id: string,
    userData: Partial<InsertUser>
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  }

  async findPotentialMatches(item: Item): Promise<Item[]> {
    const oppositeType =
      item.type === "lost" ? "found" : "lost";

    const keywords = item.description
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);

    if (keywords.length === 0) {
      return [];
    }

    const conditions = keywords.map((word) =>
      ilike(items.description, `%${word}%`)
    );

    return await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.type, oppositeType),
          or(...conditions)
        )
      )
      .orderBy(desc(items.dateReported));
  }

  async getStats(): Promise<{
    totalItems: number;
    lostItems: number;
    foundItems: number;
    claimedItems: number;
  }> {
    const allItems = await db.select().from(items);

    const active = allItems.filter(
      (i: any) =>
        i.status === "reported" ||
        i.status === "pending_verification"
    );

    const total = active.length;

    const lost = active.filter(
      (i: any) => i.type === "lost"
    ).length;

    const found = active.filter(
      (i: any) => i.type === "found"
    ).length;

    const claimed = allItems.filter(
      (i: any) =>
        i.status === "claimed" ||
        i.status === "retrieved" ||
        i.status === "verified" ||
        i.status === "resolved"
    ).length;

    return {
      totalItems: total,
      lostItems: lost,
      foundItems: found,
      claimedItems: claimed,
    };
  }

  async getExpiredItems(days: number = 30): Promise<Item[]> {
    const cutoffDate = new Date();

    cutoffDate.setDate(
      cutoffDate.getDate() - days
    );

    return await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.type, "found"),
          eq(items.status, "pending_verification"),
          lt(items.dateReported, cutoffDate)
        )
      );
  }

  // ============================================================
  // CLAIMS
  // ============================================================

  // Return claims that require admin attention.
  //
  // "pending" = claimant passed the verification questions.
  // "manual_verification" = finder provided no verification
  // questions, so the admin must manually verify ownership.
  async getPendingClaims(): Promise<any[]> {
    return await db
      .select()
      .from(claims)
      .where(
        or(
          eq(claims.status, "pending"),
          eq(claims.status, "manual_verification")
        )
      )
      .orderBy(desc(claims.created_at));
  }

  async createClaim(
    itemId: number,
    claimantName: string | undefined,
    claimantEmail: string | undefined,
    claimedDetails: any,
    matchScore: number = 0,
    status: string = "pending"
  ): Promise<any> {
    const claimedDetailsJson =
      claimedDetails == null
        ? JSON.stringify({})
        : JSON.stringify(claimedDetails);

    const [claim] = await db
      .insert(claims)
      .values({
        item_id: itemId,
        claimant_name: claimantName || null,
        claimant_email: claimantEmail || null,
        claimed_details: claimedDetailsJson,
        match_score: matchScore,
        status,
      })
      .returning();

    return claim;
  }

  async getClaimsForItem(
    itemId: number
  ): Promise<any[]> {
    return await db
      .select()
      .from(claims)
      .where(eq(claims.item_id, itemId))
      .orderBy(desc(claims.created_at));
  }

  async getClaimById(
    claimId: number
  ): Promise<any | undefined> {
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.id, claimId));

    return claim;
  }

  async reviewClaim(
    claimId: number,
    reviewer: string,
    action: "accept" | "reject",
    notes?: string,
    setStatus?: string
  ): Promise<any> {
    const status =
      action === "accept"
        ? "accepted"
        : "rejected";

    const [claim] = await db
      .update(claims)
      .set({
        status,
        reviewed_at: new Date(),
        reviewer,
        notes: notes || null,
      })
      .where(eq(claims.id, claimId))
      .returning();

    if (!claim) {
      return undefined;
    }

    if (
      action === "accept" &&
      claim.item_id &&
      setStatus
    ) {
      await this.updateItemStatus(
        claim.item_id,
        setStatus
      );
    }

    return claim;
  }
}

export const storage = new DatabaseStorage();
```
