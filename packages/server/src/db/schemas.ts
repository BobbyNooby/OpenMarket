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
  bio: text("bio"),
  social_links: text("social_links"), // JSON string of {discord, twitter, ...}
  accent_color: text("accent_color"), // hex color
  notification_preferences: text("notification_preferences").notNull().default('{}'), // JSON string of Record<NotificationType, boolean>
  language: text("language").notNull().default('en'), // BCP-47 locale, syncs language preference across devices
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

// --- analytics events ---
export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  event_type: text("event_type").notNull(),
  user_id: text("user_id").references(() => user.id, { onDelete: "set null", onUpdate: "cascade" }),
  session_id: text("session_id"),
  metadata: text("metadata"), // JSON string — jsonb would need raw sql
  path: text("path"),
  referrer: text("referrer"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_analytics_type_created").on(t.event_type, t.created_at),
  index("idx_analytics_user_created").on(t.user_id, t.created_at),
  index("idx_analytics_session").on(t.session_id),
]);

export type AnalyticsEventInsert = typeof analyticsEventsTable.$inferInsert;
export type AnalyticsEventSelect = typeof analyticsEventsTable.$inferSelect;

// --- trades ---
export const tradesTable = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  seller_id: text("seller_id").notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  buyer_id: text("buyer_id")
    .references(() => user.id, { onDelete: "set null", onUpdate: "cascade" }),
  listing_snapshot: text("listing_snapshot").notNull(), // JSON string of frozen listing data
  completed_at: timestamp("completed_at").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_trades_seller").on(t.seller_id),
  index("idx_trades_buyer").on(t.buyer_id),
  index("idx_trades_completed").on(t.completed_at),
]);

export type TradeInsert = typeof tradesTable.$inferInsert;
export type TradeSelect = typeof tradesTable.$inferSelect;

// --- watchlist ---
export const watchlistTable = pgTable("watchlist", {
  user_id: text("user_id").notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  listing_id: uuid("listing_id").notNull()
    .references(() => listingsTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.user_id, t.listing_id] }),
  index("idx_watchlist_user").on(t.user_id),
  index("idx_watchlist_listing").on(t.listing_id),
]);

export type WatchlistInsert = typeof watchlistTable.$inferInsert;
export type WatchlistSelect = typeof watchlistTable.$inferSelect;

// --- user item lists (have / want) ---
export const itemListType = pgEnum("item_list_type", ["have", "want"]);

export const userItemListsTable = pgTable("user_item_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  list_type: itemListType("list_type").notNull(),
  item_id: uuid("item_id").references(() => itemsTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
  currency_id: uuid("currency_id").references(() => currenciesTable.id, { onDelete: "cascade", onUpdate: "cascade" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_user_item_lists_user_type").on(t.user_id, t.list_type),
  index("idx_user_item_lists_item").on(t.item_id),
  index("idx_user_item_lists_currency").on(t.currency_id),
]);

export type UserItemListInsert = typeof userItemListsTable.$inferInsert;
export type UserItemListSelect = typeof userItemListsTable.$inferSelect;

// --- notifications ---
export const notificationType = pgEnum("notification_type", [
  "new_message",
  "new_review",
  "listing_expired",
  "listing_sold",
  "role_changed",
  "warning_received",
  "report_resolved",
]);

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  type: notificationType("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_notifications_user_read_created").on(t.user_id, t.is_read, t.created_at),
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
export type NotificationInsert = typeof notificationsTable.$inferInsert;
export type NotificationSelect = typeof notificationsTable.$inferSelect;

// --- uploads (locally-hosted user files) ---
// Every uploaded image has a row here. Other features reference uploads by id
// so deletion can cascade and ownership is tracked.
export const uploadsTable = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  filename: text("filename").notNull(),
  mime_type: text("mime_type").notNull(),
  size_bytes: integer("size_bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_uploads_user_created").on(t.user_id, t.created_at),
]);

export type UploadInsert = typeof uploadsTable.$inferInsert;
export type UploadSelect = typeof uploadsTable.$inferSelect;

// --- site config (white-label branding) ---
// Non-theme key/value config: site_name, tagline, logo URL, footer text, links, etc.
export const siteConfigTable = pgTable("site_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(''),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  updated_by: text("updated_by").references(() => user.id, { onDelete: "set null", onUpdate: "cascade" }),
});

// Per-variant theme variables — one row per (light|dark, variable_name)
export const themeVariant = pgEnum("theme_variant", ["light", "dark"]);

export const siteThemeTable = pgTable("site_theme", {
  variant: themeVariant("variant").notNull(),
  variable: text("variable").notNull(), // 'primary', 'background', 'card-foreground', etc.
  value: text("value").notNull(),         // HSL triplet like '217.2 91.2% 59.8%'
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  updated_by: text("updated_by").references(() => user.id, { onDelete: "set null", onUpdate: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.variant, t.variable] }),
]);

export type SiteConfigInsert = typeof siteConfigTable.$inferInsert;
export type SiteConfigSelect = typeof siteConfigTable.$inferSelect;
export type SiteThemeInsert = typeof siteThemeTable.$inferInsert;
export type SiteThemeSelect = typeof siteThemeTable.$inferSelect;
