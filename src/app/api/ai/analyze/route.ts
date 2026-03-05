import { NextRequest, NextResponse } from "next/server";
import { triggerAnalysis } from "@/lib/analyze";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { imageId } = await req.json();

  try {
    await triggerAnalysis(imageId, DEFAULT_USER_ID);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("AI analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
