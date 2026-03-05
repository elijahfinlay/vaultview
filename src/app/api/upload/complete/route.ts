import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/schema";
import { triggerAnalysis } from "@/lib/analyze";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { url, filename, contentType, size, width, height, blurhash } =
    await req.json();

  if (!url) {
    return NextResponse.json({ error: "Missing blob URL" }, { status: 400 });
  }

  const [image] = await db
    .insert(images)
    .values({
      userId: DEFAULT_USER_ID,
      filename: url, // Store the full blob URL as filename for deletion
      originalName: filename,
      mimeType: contentType,
      size,
      width,
      height,
      blurhash,
      url,
    })
    .returning();

  // Trigger AI analysis directly (non-blocking)
  triggerAnalysis(image.id, DEFAULT_USER_ID).catch(() => {});

  return NextResponse.json({ image });
}
