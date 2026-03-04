import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { images, imageCategories, categories } from "@/lib/schema";
import { eq, and, desc, asc, sql, or, inArray } from "drizzle-orm";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "date_desc";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") || String(PAGE_SIZE)),
    100
  );

  const conditions = [eq(images.userId, session.user.id)];

  // Full-text + trigram search
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
    conditions.push(sql`${images.createdAt} < ${cursor}`);
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

  const results = await db
    .select()
    .from(images)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = results.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt?.toISOString() : null;

  return NextResponse.json({
    images: items,
    nextCursor,
    hasMore,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  const [deleted] = await db
    .delete(images)
    .where(and(eq(images.id, id), eq(images.userId, session.user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Optionally delete from R2 (fire-and-forget)
  try {
    const { deleteFromR2 } = await import("@/lib/r2");
    await deleteFromR2(deleted.filename);
  } catch {
    // Non-critical
  }

  return NextResponse.json({ success: true });
}
