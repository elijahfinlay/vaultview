import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/schema";
import { triggerAnalysis } from "@/lib/analyze";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { key, filename, contentType, size, width, height, blurhash } =
    await req.json();

  const imageUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL}/${key}`
    : key;

  const [image] = await db
    .insert(images)
    .values({
      userId: DEFAULT_USER_ID,
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

  // Trigger AI analysis directly
  triggerAnalysis(image.id, DEFAULT_USER_ID).catch(() => {});

  return NextResponse.json({ image });
}
