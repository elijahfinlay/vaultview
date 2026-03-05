import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images, imageCategories } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { categoryIds } = await req.json();

  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, DEFAULT_USER_ID)));

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await db.delete(imageCategories).where(eq(imageCategories.imageId, id));

  if (categoryIds?.length > 0) {
    await db.insert(imageCategories).values(
      categoryIds.map((categoryId: string) => ({
        imageId: id,
        categoryId,
      }))
    );
  }

  return NextResponse.json({ success: true });
}
