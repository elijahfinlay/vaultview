import { db } from "@/lib/db";
import { images, categories, imageCategories } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { analyzeImage, categorizeLables } from "@/lib/vision";

export async function triggerAnalysis(imageId: string, userId: string) {
  try {
    const [image] = await db
      .select()
      .from(images)
      .where(and(eq(images.id, imageId), eq(images.userId, userId)));

    if (!image) return;

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

      let [category] = await db
        .select()
        .from(categories)
        .where(
          and(eq(categories.userId, userId), eq(categories.slug, slug))
        );

      if (!category) {
        [category] = await db
          .insert(categories)
          .values({ name, slug, userId })
          .returning();
      }

      await db
        .insert(imageCategories)
        .values({ imageId, categoryId: category.id })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error(`AI analysis failed for image ${imageId}:`, err);
    // Non-blocking — upload still succeeds
  }
}
