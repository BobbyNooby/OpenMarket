import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// --- enums ---
export const reviewType = pgEnum("review_type", ["upvote", "downvote"]);
export const orderType = pgEnum("order_type", ["buy", "sell"]);
export const payingType = pgEnum("paying_type", ["each", "total"]);
export const listingStatus = pgEnum("listing_status", ["active", "sold", "paused", "expired"]);
export const reportTargetType = pgEnum("report_target_type", ["listing", "review", "user"]);
export const reportStatus = pgEnum("report_status", ["pending", "resolved", "dismissed"]);

// Re-export auth user table for convenience
export { user, session, account, verification } from "./auth-schema";

// --- user profiles (extension of auth user table) ---
// Stores marketplace-specific user data that better-auth doesn't handle
export const userProfilesTable = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  username: text("username").notNull().unique(),
  description: text("description"),
});

// --- activity ---
export const usersActivityTable = pgTable("users_activity", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  is_active: boolean("is_active").notNull().default(false),
  last_activity_at: timestamp("last_activity_at").notNull().defaultNow(),
});

// --- item categories ---
export const itemCategoriesTable = pgTable("item_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  icon_url: text("icon_url"),
});

// --- items/currencies (generic) ---
export const itemsTable = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  wiki_link: text("wiki_link"),
  image_url: text("image_url"),
  category_id: uuid("category_id").references(() => itemCategoriesTable.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
});

export const currenciesTable = pgTable("currencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  wiki_link: text("wiki_link"),
  image_url: text("image_url"),
});

// --- profile reviews ---
export const profileReviewsTable = pgTable("profile_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  profile_user_id: text("profile_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  voter_user_id: text("voter_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  type: reviewType("type").notNull(),
  comment: text("comment"),
}, (t) => [
  index("idx_reviews_profile_user").on(t.profile_user_id),
  index("idx_reviews_voter_user").on(t.voter_user_id),
]);

// --- listings (market orders) ---
// A listing can request either an item OR a currency (one must be set, the other null)
export const listingsTable = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  author_id: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  requested_item_id: uuid("requested_item_id").references(() => itemsTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  requested_currency_id: uuid("requested_currency_id").references(
    () => currenciesTable.id,
    { onDelete: "cascade", onUpdate: "cascade" },
  ),
  amount: integer("amount").notNull().default(1),
  order_type: orderType("order_type").notNull(),
  paying_type: payingType("paying_type").notNull().default("each"),
  status: listingStatus("status").notNull().default("active"),
  expires_at: timestamp("expires_at"),
}, (t) => [
  index("idx_listings_status_created").on(t.status, t.created_at),
  index("idx_listings_status_expires").on(t.status, t.expires_at),
  index("idx_listings_author").on(t.author_id),
  index("idx_listings_requested_item").on(t.requested_item_id),
  index("idx_listings_requested_currency").on(t.requested_currency_id),
]);

// --- listing offered items (many-to-many) ---
export const listingOfferedItemsTable = pgTable("listing_offered_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  listing_id: uuid("listing_id")
    .notNull()
    .references(() => listingsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  item_id: uuid("item_id")
    .notNull()
    .references(() => itemsTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  amount: integer("amount").notNull().default(1),
}, (t) => [
  index("idx_offered_items_listing").on(t.listing_id),
]);

// --- listing offered currencies (many-to-many) ---
export const listingOfferedCurrenciesTable = pgTable(
  "listing_offered_currencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listing_id: uuid("listing_id")
      .notNull()
      .references(() => listingsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    currency_id: uuid("currency_id")
      .notNull()
      .references(() => currenciesTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    amount: integer("amount").notNull().default(1),
  },
  (t) => [
    index("idx_offered_currencies_listing").on(t.listing_id),
  ],
);

// --- reports ---
export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporter_id: text("reporter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  target_type: reportTargetType("target_type").notNull(),
  target_id: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: reportStatus("status").notNull().default("pending"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  resolved_by: text("resolved_by")
    .references(() => user.id, { onDelete: "set null", onUpdate: "cascade" }),
  resolved_at: timestamp("resolved_at"),
}, (t) => [
  index("idx_reports_status").on(t.status),
  index("idx_reports_target").on(t.target_type, t.target_id),
]);

// --- messaging ---
export const conversationsTable = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  listing_id: uuid("listing_id").references(() => listingsTable.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
}, (t) => [
  index("idx_conversations_listing").on(t.listing_id),
  index("idx_conversations_updated").on(t.updated_at),
]);

export const conversationParticipantsTable = pgTable("conversation_participants", {
  conversation_id: uuid("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  joined_at: timestamp("joined_at").defaultNow().notNull(),
  last_read_at: timestamp("last_read_at"),
}, (t) => [
  primaryKey({ columns: [t.conversation_id, t.user_id] }),
  index("idx_participants_user").on(t.user_id),
]);

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
  sender_id: text("sender_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  edited_at: timestamp("edited_at"),
  is_deleted: boolean("is_deleted").notNull().default(false),
}, (t) => [
  index("idx_messages_conversation_created").on(t.conversation_id, t.created_at),
  index("idx_messages_sender").on(t.sender_id),
]);

// --- Type exports ---
export type ItemCategoryInsert = typeof itemCategoriesTable.$inferInsert;
export type ItemCategorySelect = typeof itemCategoriesTable.$inferSelect;
export type UserProfileInsert = typeof userProfilesTable.$inferInsert;
export type UserProfileSelect = typeof userProfilesTable.$inferSelect;
export type UserActivityInsert = typeof usersActivityTable.$inferInsert;
export type UserActivitySelect = typeof usersActivityTable.$inferSelect;
export type ItemInsert = typeof itemsTable.$inferInsert;
export type ItemSelect = typeof itemsTable.$inferSelect;
export type CurrencyInsert = typeof currenciesTable.$inferInsert;
export type CurrencySelect = typeof currenciesTable.$inferSelect;
export type ProfileReviewInsert = typeof profileReviewsTable.$inferInsert;
export type ProfileReviewSelect = typeof profileReviewsTable.$inferSelect;
export type ListingInsert = typeof listingsTable.$inferInsert;
export type ListingSelect = typeof listingsTable.$inferSelect;
export type ListingOfferedItemInsert =
  typeof listingOfferedItemsTable.$inferInsert;
export type ListingOfferedItemSelect =
  typeof listingOfferedItemsTable.$inferSelect;
export type ListingOfferedCurrencyInsert =
  typeof listingOfferedCurrenciesTable.$inferInsert;
export type ListingOfferedCurrencySelect =
  typeof listingOfferedCurrenciesTable.$inferSelect;
export type ReportInsert = typeof reportsTable.$inferInsert;
export type ReportSelect = typeof reportsTable.$inferSelect;
export type ConversationInsert = typeof conversationsTable.$inferInsert;
export type ConversationSelect = typeof conversationsTable.$inferSelect;
export type ConversationParticipantInsert = typeof conversationParticipantsTable.$inferInsert;
export type ConversationParticipantSelect = typeof conversationParticipantsTable.$inferSelect;
export type MessageInsert = typeof messagesTable.$inferInsert;
export type MessageSelect = typeof messagesTable.$inferSelect;
