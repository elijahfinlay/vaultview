import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { triggerAnalysis } from "@/lib/analyze";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId } = await req.json();

  try {
    await triggerAnalysis(imageId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("AI analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
