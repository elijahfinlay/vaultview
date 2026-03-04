import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, id), eq(images.userId, session.user.id)));

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return NextResponse.json(image);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(images)
    .where(and(eq(images.id, id), eq(images.userId, session.user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const { deleteFromR2 } = await import("@/lib/r2");
    await deleteFromR2(deleted.filename);
  } catch {
    // Non-critical
  }

  return NextResponse.json({ success: true });
}
