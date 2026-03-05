import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, imageCategories } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function GET() {
  const result = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      color: categories.color,
      imageCount: count(imageCategories.imageId),
    })
    .from(categories)
    .leftJoin(imageCategories, eq(categories.id, imageCategories.categoryId))
    .where(eq(categories.userId, DEFAULT_USER_ID))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const [category] = await db
    .insert(categories)
    .values({
      name,
      slug,
      color: color || "#6366f1",
      userId: DEFAULT_USER_ID,
    })
    .onConflictDoNothing()
    .returning();

  if (!category) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  return NextResponse.json(category, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, DEFAULT_USER_ID)));

  return NextResponse.json({ success: true });
}
