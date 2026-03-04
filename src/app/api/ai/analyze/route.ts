import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { images, categories, imageCategories } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { analyzeImage, categorizeLables } from "@/lib/vision";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId } = await req.json();

  // Fetch image record
  const [image] = await db
    .select()
    .from(images)
    .where(and(eq(images.id, imageId), eq(images.userId, session.user.id)));

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  try {
    const result = await analyzeImage(image.url);

    // Update image with AI data
    await db
      .update(images)
      .set({
        aiLabels: result.labels,
        aiDescription: result.description,
        aiColors: result.colors,
        aiText: result.text,
        aiSafeSearch: result.safeSearch,
        analyzed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(images.id, imageId));

    // Auto-categorize based on labels
    const categoryNames = categorizeLables(result.labels);

    for (const name of categoryNames) {
      const slug = name.toLowerCase().replace(/\s+/g, "-");

      // Upsert category
      let [category] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.userId, session.user.id),
            eq(categories.slug, slug)
          )
        );

      if (!category) {
        [category] = await db
          .insert(categories)
          .values({
            name,
            slug,
            userId: session.user.id,
          })
          .returning();
      }

      // Link image to category (ignore conflicts)
      await db
        .insert(imageCategories)
        .values({ imageId, categoryId: category.id })
        .onConflictDoNothing();
    }

    return NextResponse.json({ success: true, labels: result.labels, categories: categoryNames });
  } catch (err) {
    console.error("AI analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
