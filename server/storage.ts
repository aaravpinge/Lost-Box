import { db } from "./db";
import { items, type Item, type InsertItem } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItemStatus(id: number, status: string, claimedBy?: string): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(desc(items.dateReported));
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem as any).returning();
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
}

export const storage = new DatabaseStorage();
