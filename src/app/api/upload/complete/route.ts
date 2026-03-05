import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/schema";
import { triggerAnalysis } from "@/lib/analyze";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, filename, contentType, size, width, height, blurhash } =
    await req.json();

  const imageUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : key; // Fallback — will need R2_PUBLIC_URL for images to display

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
      url: imageUrl,
    })
    .returning();

  // Trigger AI analysis directly (no self-fetch, no cookie issues)
  triggerAnalysis(image.id, session.user.id).catch(() => {
    // Fire-and-forget — analysis failure doesn't block upload response
  });

  return NextResponse.json({ image });
}
