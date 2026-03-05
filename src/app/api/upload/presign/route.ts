import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/r2";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { nanoid } from "nanoid";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  const { filename, contentType, size } = await req.json();

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  if (size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const ext = filename.split(".").pop() || "jpg";
  const key = `${DEFAULT_USER_ID}/${nanoid()}.${ext}`;

  const presignedUrl = await getPresignedUploadUrl(key, contentType, size);

  return NextResponse.json({
    presignedUrl,
    key,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
  });
}
