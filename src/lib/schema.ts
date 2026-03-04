import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// Custom tsvector type for full-text search
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ─── NextAuth Tables ─────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ─── App Tables ──────────────────────────────────────────────

export const images = pgTable(
  "images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    blurhash: text("blurhash"),
    url: text("url").notNull(),
    // AI analysis fields
    aiLabels: jsonb("ai_labels").$type<string[]>(),
    aiDescription: text("ai_description"),
    aiColors: jsonb("ai_colors").$type<string[]>(),
    aiText: text("ai_text"),
    aiSafeSearch: jsonb("ai_safe_search").$type<Record<string, string>>(),
    analyzed: timestamp("analyzed_at", { mode: "date" }),
    // Search vector (auto-populated by DB trigger)
    searchVector: tsvector("search_vector"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    index("images_user_id_idx").on(table.userId),
    index("images_created_at_idx").on(table.createdAt),
    index("images_search_vector_idx").using("gin", table.searchVector),
  ]
);

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    color: text("color").default("#6366f1"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_user_slug_idx").on(table.userId, table.slug),
  ]
);

export const imageCategories = pgTable(
  "image_categories",
  {
    imageId: text("image_id")
      .notNull()
      .references(() => images.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.imageId, table.categoryId] })]
);

// ─── Relations ───────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  images: many(images),
  categories: many(categories),
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  user: one(users, { fields: [images.userId], references: [users.id] }),
  imageCategories: many(imageCategories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  imageCategories: many(imageCategories),
}));

export const imageCategoriesRelations = relations(
  imageCategories,
  ({ one }) => ({
    image: one(images, {
      fields: [imageCategories.imageId],
      references: [images.id],
    }),
    category: one(categories, {
      fields: [imageCategories.categoryId],
      references: [categories.id],
    }),
  })
);
