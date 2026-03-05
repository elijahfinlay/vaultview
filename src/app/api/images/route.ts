import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images, imageCategories, categories } from "@/lib/schema";
import { eq, and, desc, asc, sql, or, inArray } from "drizzle-orm";
import { DEFAULT_USER_ID } from "@/lib/constants";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "date_desc";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(PAGE_SIZE)),
    100
  );

  const conditions = [eq(images.userId, DEFAULT_USER_ID)];

  // Full-text + trigram search (with graceful fallback)
  if (q) {
    conditions.push(
      or(
        sql`${images.searchVector} @@ plainto_tsquery('english', ${q})`,
        sql`similarity(${images.originalName}, ${q}) > 0.1`,
        sql`similarity(coalesce(${images.aiDescription}, ''), ${q}) > 0.1`
      )!
    );
  }

  // Category filter
  if (category) {
    const imageIdsInCategory = db
      .select({ imageId: imageCategories.imageId })
      .from(imageCategories)
      .innerJoin(categories, eq(imageCategories.categoryId, categories.id))
      .where(eq(categories.slug, category));

    conditions.push(inArray(images.id, imageIdsInCategory));
  }

  // Cursor-based pagination
  if (cursor) {
    try {
      const cursorData = JSON.parse(cursor);
      switch (sort) {
        case "date_asc":
          conditions.push(sql`${images.createdAt} > ${cursorData.createdAt}`);
          break;
        case "name_asc":
          conditions.push(sql`${images.originalName} > ${cursorData.originalName}`);
          break;
        case "name_desc":
          conditions.push(sql`${images.originalName} < ${cursorData.originalName}`);
          break;
        case "size_asc":
          conditions.push(sql`${images.size} > ${cursorData.size}`);
          break;
        case "size_desc":
          conditions.push(sql`${images.size} < ${cursorData.size}`);
          break;
        default:
          conditions.push(sql`${images.createdAt} < ${cursorData.createdAt}`);
          break;
      }
    } catch {
      // Invalid cursor
    }
  }

  // Sort
  const orderBy = (() => {
    switch (sort) {
      case "date_asc":
        return asc(images.createdAt);
      case "name_asc":
        return asc(images.originalName);
      case "name_desc":
        return desc(images.originalName);
      case "size_asc":
        return asc(images.size);
      case "size_desc":
        return desc(images.size);
      default:
        return desc(images.createdAt);
    }
  })();

  let results;
  try {
    results = await db
      .select()
      .from(images)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit + 1);
  } catch (err) {
    if (q && String(err).includes("similarity")) {
      const fallbackConditions = [eq(images.userId, DEFAULT_USER_ID)];
      fallbackConditions.push(
        or(
          sql`${images.originalName} ILIKE ${'%' + q + '%'}`,
          sql`${images.aiDescription} ILIKE ${'%' + q + '%'}`
        )!
      );
      results = await db
        .select()
        .from(images)
        .where(and(...fallbackConditions))
        .orderBy(orderBy)
        .limit(limit + 1);
    } else {
      throw err;
    }
  }

  const hasMore = results.length > limit;
  const items = results.slice(0, limit);

  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem
    ? JSON.stringify({
        createdAt: lastItem.createdAt?.toISOString(),
        originalName: lastItem.originalName,
        size: lastItem.size,
      })
    : null;

  return NextResponse.json({
    images: items,
    nextCursor,
    hasMore,
  });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  const [deleted] = await db
    .delete(images)
    .where(and(eq(images.id, id), eq(images.userId, DEFAULT_USER_ID)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const { deleteFromStorage } = await import("@/lib/storage");
    await deleteFromStorage(deleted.url);
  } catch {
    // Non-critical
  }

  return NextResponse.json({ success: true });
}
