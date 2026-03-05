import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// At build time DATABASE_URL may not exist, so create a stub that throws at call time
const sql: NeonQueryFunction<false, false> = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : ((() => {
      throw new Error("DATABASE_URL not configured");
    }) as any);

export const db = drizzle(sql, { schema });
