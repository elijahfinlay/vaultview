import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { images, imageCategories } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { categoryIds } = await req.json();

  // Verify image ownership
  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, session.user.id)));

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Replace all category assignments
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
