import { db } from "@/lib/db";
import { images } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Gallery } from "@/components/gallery";
import { DEFAULT_USER_ID } from "@/lib/constants";

export default async function DashboardPage() {
  const [imageCount] = await db
    .select({ count: count() })
    .from(images)
    .where(eq(images.userId, DEFAULT_USER_ID));

  return (
    <Gallery userId={DEFAULT_USER_ID} initialCount={imageCount?.count ?? 0} />
  );
}
