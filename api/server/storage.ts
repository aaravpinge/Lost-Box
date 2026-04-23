import { db } from "./db.js";
import { items, users, type Item, type InsertItem, type User, type UpsertUser as InsertUser } from "../../shared/schema.js";
import { eq, desc, or, and, ilike, lt } from "drizzle-orm";

export interface IStorage {
  getItems(type?: string, search?: string): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItemStatus(id: number, status: string, claimedBy?: string): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;

  // Auth methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  findPotentialMatches(item: Item): Promise<Item[]>;
  getStats(): Promise<{ totalItems: number; lostItems: number; foundItems: number; claimedItems: number }>;
  getExpiredItems(days?: number): Promise<Item[]>;
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

    if (filters.length > 0) {
      // @ts-ignore - Drizzle where with multiple filters
      return await query.where(and(...filters)).orderBy(desc(items.dateReported));
    }

    return await query.orderBy(desc(items.dateReported));
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const formattedItem = {
      ...insertItem,
      dateLost: insertItem.dateLost ? new Date(insertItem.dateLost) : null,
      dateFound: insertItem.dateFound ? new Date(insertItem.dateFound) : null,
    };
    const [item] = await db.insert(items).values(formattedItem as any).returning();
    return item;
  }

  async updateItemStatus(id: number, status: string, claimedBy?: string): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({ status: status as any, claimedBy: claimedBy || null })
      .where(eq(items.id, id))
      .returning();
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async findPotentialMatches(item: Item): Promise<Item[]> {
    const oppositeType = item.type === "lost" ? "found" : "lost";
    const keywords = item.description
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);

    if (keywords.length === 0) return [];

    const conditions = keywords.map((word) => ilike(items.description, `%${word}%`));

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

  async getStats(): Promise<{ totalItems: number; lostItems: number; foundItems: number; claimedItems: number }> {
    const allItems = await db.select().from(items);
    const active = allItems.filter((i: any) => i.status === 'reported');
    const total = active.length;
    const lost = active.filter((i: any) => i.type === 'lost').length;
    const found = active.filter((i: any) => i.type === 'found').length;
    const claimed = allItems.filter((i: any) => i.status === 'claimed' || i.status === 'retrieved').length;
    return { totalItems: total, lostItems: lost, foundItems: found, claimedItems: claimed };
  }

  async getExpiredItems(days: number = 30): Promise<Item[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.type, "found"),
          eq(items.status, "reported"),
          lt(items.dateReported, cutoffDate)
        )
      );
  }
}

export const storage = new DatabaseStorage();
