import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, DEFAULT_USER_ID)));

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return NextResponse.json(image);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
