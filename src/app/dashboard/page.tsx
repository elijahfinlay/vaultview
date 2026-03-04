import { auth } from "@/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Gallery } from "@/components/gallery";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [imageCount] = await db
    .select({ count: count() })
    .from(images)
    .where(eq(images.userId, session.user.id));

  return (
    <Gallery userId={session.user.id} initialCount={imageCount?.count ?? 0} />
  );
}
