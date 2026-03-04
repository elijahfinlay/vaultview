import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/schema";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, filename, contentType, size, width, height, blurhash } =
    await req.json();

  const [image] = await db
    .insert(images)
    .values({
      userId: session.user.id,
      filename: key,
      originalName: filename,
      mimeType: contentType,
      size,
      width,
      height,
      blurhash,
      url: `${process.env.R2_PUBLIC_URL}/${key}`,
    })
    .returning();

  // Trigger AI analysis in the background (non-blocking)
  const origin = req.nextUrl.origin;
  fetch(`${origin}/api/ai/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({ imageId: image.id }),
  }).catch(() => {
    // Fire-and-forget — AI analysis failures don't block upload
  });

  return NextResponse.json({ image });
}
