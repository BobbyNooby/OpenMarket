import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  user,
  userProfilesTable,
  usersActivityTable,
  itemsTable,
  currenciesTable,
  itemCategoriesTable,
  profileReviewsTable,
  listingsTable,
  listingOfferedItemsTable,
  listingOfferedCurrenciesTable,
} from "./schemas";
import { seedRbac } from "./rbac-seed";
import { userRolesTable } from "./rbac-schema";

// ============== CONFIG ==============
const CONFIG = {
  users: 50,
  listingsPerUser: { min: 7, max: 15 },
  reviewsPerUser: { min: 4, max: 15 },
  upvoteRate: 0.88,
  commentRate: 0.85,
  activeUserCount: 8,
};

// ============== HELPERS ==============
function generateId() {
  return crypto.randomUUID();
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  return new Date(now - Math.floor(Math.random() * daysBack * 86400000));
}

function getAvatarUrl(username: string): string {
  const hash = username.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const style = ["adventurer", "avataaars", "bottts", "fun-emoji", "pixel-art"][
    hash % 5
  ];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${username}`;
}

// ============== SEED DATA ==============

const users = [
  {
    username: "crimsonblade",
    display_name: "Alex",
    description: "Trading veteran with 5+ years experience",
  },
  {
    username: "shadowhunter",
    display_name: "Jordan",
    description: "Casual player looking for fair trades",
  },
  {
    username: "mysticmage",
    display_name: "Taylor",
    description: "Collector seeking rare items",
  },
  {
    username: "stormrider",
    display_name: "Morgan",
    description: "Active trader, fast responses",
  },
  {
    username: "ironfist",
    display_name: "Casey",
    description: "New to trading, learning the ropes",
  },
  {
    username: "silverarrow",
    display_name: "Riley",
    description: "Bulk seller, competitive prices",
  },
  {
    username: "goldenknight",
    display_name: "Avery",
    description: "Reliable trader with good reputation",
  },
  {
    username: "darkphoenix",
    display_name: "Quinn",
    description: "Looking for specific items, check my wishlist",
  },
  {
    username: "frostwolf",
    display_name: "Sage",
    description: "Weekend warrior, trades on Saturdays",
  },
  {
    username: "thunderstrike",
    display_name: "River",
    description: "Professional merchant, serious inquiries only",
  },
  {
    username: "dragonslayer",
    display_name: "Phoenix",
    description: "Hunting for legendary gear",
  },
  {
    username: "moonwalker",
    display_name: "Dakota",
    description: "Night owl trader, usually online late",
  },
  {
    username: "stargazer",
    display_name: "Skylar",
    description: "Astronomer by day, trader by night",
  },
  {
    username: "flamekeeper",
    display_name: "Ash",
    description: "Fire magic specialist, seeking fire items",
  },
  {
    username: "oceandrifter",
    display_name: "Blake",
    description: "Sailor and treasure hunter",
  },
  {
    username: "voidwalker",
    display_name: "Ember",
    description: "Void magic enthusiast, trading dark items",
  },
  {
    username: "crystalseer",
    display_name: "Luna",
    description: "Divination expert seeking crystals and orbs",
  },
  {
    username: "ironforge",
    display_name: "Finn",
    description: "Blacksmith trading crafted equipment",
  },
  {
    username: "windwhisper",
    display_name: "Zara",
    description: "Swift trades, wind magic user",
  },
  {
    username: "shadowveil",
    display_name: "Raven",
    description: "Stealth specialist, rare item hunter",
  },
  {
    username: "sunstrider",
    display_name: "Sol",
    description: "Light magic dealer, premium goods",
  },
  {
    username: "earthshaker",
    display_name: "Clay",
    description: "Earth magic fan, solid trades guaranteed",
  },
  {
    username: "starpilot",
    display_name: "Nova",
    description: "Space-themed gear collector",
  },
  {
    username: "runecaster",
    display_name: "Glyph",
    description: "Ancient rune specialist",
  },
  {
    username: "tideturner",
    display_name: "Coral",
    description: "Water magic gear trader",
  },
  {
    username: "blazeheart",
    display_name: "Pyra",
    description: "Fire enthusiast, always burning deals",
  },
  {
    username: "nightshade",
    display_name: "Dusk",
    description: "Poison specialist, handle with care",
  },
  {
    username: "steelguard",
    display_name: "Tank",
    description: "Heavy armor dealer",
  },
  {
    username: "swiftfox",
    display_name: "Kit",
    description: "Speed gear trader, quick deals",
  },
  {
    username: "thornweaver",
    display_name: "Briar",
    description: "Nature magic crafter",
  },
];

const categories = [
  { name: "Weapons", slug: "weapons" },
  { name: "Armor", slug: "armor" },
  { name: "Accessories", slug: "accessories" },
  { name: "Consumables", slug: "consumables" },
  { name: "Materials", slug: "materials" },
];

function itemPlaceholder(name: string, color: string = "6366f1"): string {
  const encoded = encodeURIComponent(name);
  return `https://placehold.co/128x128/1a1a2e/${color}?text=${encoded}`;
}

const items = [
  {
    name: "Calvus Crown",
    slug: "calvus-crown",
    description:
      "A crown made out of sun-forged bronze, specifically made for King Calvus IV.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Crown", "f59e0b"),
    category_slug: "accessories",
  },
  {
    name: "Dapper Witch Hat",
    slug: "dapper-witch-hat",
    description:
      "A dapper hat for dapper people. Can be enchanted by an Alchemist.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Witch+Hat", "8b5cf6"),
    category_slug: "armor",
  },
  {
    name: "Caped Golden Pauldrons",
    slug: "caped-golden-pauldrons",
    description: "An ornate set of golden pauldrons with a cape.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Pauldrons", "f59e0b"),
    category_slug: "armor",
  },
  {
    name: "Thermo Fist Belt",
    slug: "thermo-fist-belt",
    description: "A thick belt made for thermo fist users.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Fist+Belt", "ef4444"),
    category_slug: "accessories",
  },
  {
    name: "Iron Leg Armor",
    slug: "iron-leg-armor",
    description: "A set of lightweight armor made for iron leg users.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Leg+Armor", "64748b"),
    category_slug: "armor",
  },
  {
    name: "Ice Mage Coat",
    slug: "ice-mage-coat",
    description: "An arcanium-fabric coat made to conduct ice magic.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Mage+Coat", "38bdf8"),
    category_slug: "armor",
  },
  {
    name: "Sunken Iron Boots",
    slug: "sunken-iron-boots",
    description:
      "Boots made of arcanium metal that spent hundreds of years underwater.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Boots", "0ea5e9"),
    category_slug: "armor",
  },
  {
    name: "Sunken Sword",
    slug: "sunken-sword",
    description: "A powerful blade recovered from the depths of the sea.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Sword", "0ea5e9"),
    category_slug: "weapons",
  },
  {
    name: "Vastira",
    slug: "vastira",
    description: "An ancient katana once wielded by legendary warriors.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Vastira", "a855f7"),
    category_slug: "weapons",
  },
  {
    name: "Kai Sabre",
    slug: "kai-sabre",
    description: "A curved sabre favored by swift fighters.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Sabre", "22c55e"),
    category_slug: "weapons",
  },
  {
    name: "Golden Savoy Pants",
    slug: "golden-savoy-pants",
    description: "Fancy golden pants from the Savoy kingdom.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Pants", "f59e0b"),
    category_slug: "armor",
  },
  {
    name: "Golden Shoulder Plate",
    slug: "golden-shoulder-plate",
    description: "A single ornate golden shoulder piece.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Shoulder", "f59e0b"),
    category_slug: "armor",
  },
  {
    name: "Healing Potion",
    slug: "healing-potion",
    description: "Restores a moderate amount of health.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Potion", "22c55e"),
    category_slug: "consumables",
  },
  {
    name: "Dark Sea Essence",
    slug: "dark-sea-essence",
    description: "A rare material harvested from the Dark Sea.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Essence", "7c3aed"),
    category_slug: "materials",
  },
  {
    name: "Stormcaller Staff",
    slug: "stormcaller-staff",
    description:
      "A staff that crackles with lightning energy. Amplifies thunder-based attacks.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Staff", "38bdf8"),
    category_slug: "weapons",
  },
  {
    name: "Ravenna Shield",
    slug: "ravenna-shield",
    description:
      "A sturdy bronze shield bearing the Ravenna crest. High defense stats.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Shield", "f59e0b"),
    category_slug: "armor",
  },
  {
    name: "Shadow Cloak",
    slug: "shadow-cloak",
    description:
      "A dark cloak woven from void threads. Increases stealth and agility.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Cloak", "475569"),
    category_slug: "armor",
  },
  {
    name: "Phoenix Feather",
    slug: "phoenix-feather",
    description:
      "A rare crafting material dropped by fire phoenixes. Used in high-tier enchantments.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Feather", "ef4444"),
    category_slug: "materials",
  },
  {
    name: "Amulet of the Tides",
    slug: "amulet-of-the-tides",
    description:
      "An ancient amulet that pulses with ocean energy. Boosts water magic.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Amulet", "0ea5e9"),
    category_slug: "accessories",
  },
  {
    name: "Speed Elixir",
    slug: "speed-elixir",
    description:
      "Temporarily increases movement and attack speed for 60 seconds.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Elixir", "22c55e"),
    category_slug: "consumables",
  },
];

const currencies = [
  {
    name: "Galleons",
    slug: "galleons",
    description: "The primary currency of the Bronze Sea.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Galleons", "f59e0b"),
  },
  {
    name: "Gems",
    slug: "gems",
    description: "Premium currency used for rare purchases.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Gems", "ec4899"),
  },
  {
    name: "Silverstone",
    slug: "silverstone",
    description: "A rare mineral used as currency by merchants.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Silver", "94a3b8"),
  },
  {
    name: "Dark Doubloons",
    slug: "dark-doubloons",
    description: "Cursed coins from the Dark Sea. Accepted by shady merchants.",
    wiki_link: "https://bobbynooby.dev",
    image_url: itemPlaceholder("Doubloons", "7c3aed"),
  },
];

const reviewComments = [
  "Great trader, fast response!",
  "Smooth transaction, would trade again.",
  "Very reliable, item was exactly as described.",
  "Fair prices, good communication.",
  "Quick and easy trade!",
  "Trustworthy trader.",
  "Best deals around!",
  "Friendly and professional.",
  "Excellent experience overall.",
  "Good trader but a bit slow to respond.",
  "Item quality was great.",
  "Would recommend to others.",
  "Fair trade, no issues.",
  "Helpful and patient trader.",
  "Top-notch service!",
];

// ============== SEED FUNCTION ==============

async function seed() {
  console.log("\n=== OpenMarket Database Seed ===\n");

  // Clean existing seed data only — never touch real user accounts
  console.log("Cleaning existing seed data...");
  const testFilter = sql`email LIKE '%@openmarket.test'`;
  const testUserIds = sql`(SELECT id FROM "user" WHERE ${testFilter})`;

  // Delete seed user data (scoped to test emails)
  await db.execute(sql`DELETE FROM "listing_offered_currencies" WHERE "listing_id" IN (SELECT id FROM "listings" WHERE "author_id" IN ${testUserIds})`);
  await db.execute(sql`DELETE FROM "listing_offered_items" WHERE "listing_id" IN (SELECT id FROM "listings" WHERE "author_id" IN ${testUserIds})`);
  await db.execute(sql`DELETE FROM "listings" WHERE "author_id" IN ${testUserIds}`);
  await db.execute(sql`DELETE FROM "profile_reviews" WHERE "profile_user_id" IN ${testUserIds} OR "voter_user_id" IN ${testUserIds}`);
  await db.execute(sql`DELETE FROM "users_activity" WHERE "user_id" IN ${testUserIds}`);
  await db.execute(sql`DELETE FROM "user_profiles" WHERE "user_id" IN ${testUserIds}`);
  await db.execute(sql`DELETE FROM "user_roles" WHERE "user_id" IN ${testUserIds}`);
  await db.execute(sql`DELETE FROM "account" WHERE "user_id" IN ${testUserIds}`);
  await db.execute(sql`DELETE FROM "session" WHERE "user_id" IN ${testUserIds}`);
  await db.execute(sql`DELETE FROM "user" WHERE ${testFilter}`);

  // Clean catalog (items/currencies/categories are shared, safe to reset)
  await db.delete(itemsTable);
  await db.delete(currenciesTable);
  await db.delete(itemCategoriesTable);
  console.log("   Done (your real account is untouched)");

  // Seed RBAC first
  await seedRbac();

  // Insert categories
  console.log("Inserting categories...");
  const insertedCategories = await db
    .insert(itemCategoriesTable)
    .values(categories)
    .returning();
  const categoryMap = new Map(insertedCategories.map((c) => [c.slug, c.id]));
  console.log(`   Inserted ${insertedCategories.length} categories`);

  // Insert users
  console.log("Inserting users...");
  const insertedUsers: { id: string; username: string }[] = [];

  const usersToInsert =
    CONFIG.users <= users.length
      ? users.slice(0, CONFIG.users)
      : [
          ...users,
          ...Array.from({ length: CONFIG.users - users.length }, (_, i) => ({
            username: `trader${users.length + i + 1}`,
            display_name: `Trader ${users.length + i + 1}`,
            description: `Trader #${users.length + i + 1}`,
          })),
        ];

  for (const userData of usersToInsert) {
    const userId = generateId();
    const now = new Date();

    await db.insert(user).values({
      id: userId,
      name: userData.display_name,
      email: `${userData.username}@openmarket.test`,
      emailVerified: false,
      image: getAvatarUrl(userData.username),
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(userProfilesTable).values({
      userId: userId,
      username: userData.username,
      description: userData.description,
    });

    // Assign the default 'user' role
    await db
      .insert(userRolesTable)
      .values({
        userId: userId,
        roleId: "user",
      })
      .onConflictDoNothing();

    insertedUsers.push({ id: userId, username: userData.username });
  }
  console.log(`   Inserted ${insertedUsers.length} users`);

  // Insert activity
  console.log("Inserting user activity...");
  await db.insert(usersActivityTable).values(
    insertedUsers.map((u, i) => ({
      user_id: u.id,
      is_active: i < CONFIG.activeUserCount,
      last_activity_at: randomDate(7),
    })),
  );

  // Insert items with categories
  console.log("Inserting items...");
  const insertedItems = await db
    .insert(itemsTable)
    .values(
      items.map(({ category_slug, ...item }) => ({
        ...item,
        category_id: categoryMap.get(category_slug) ?? null,
      })),
    )
    .returning();
  console.log(`   Inserted ${insertedItems.length} items`);

  // Insert currencies
  console.log("Inserting currencies...");
  const insertedCurrencies = await db
    .insert(currenciesTable)
    .values(currencies)
    .returning();
  console.log(`   Inserted ${insertedCurrencies.length} currencies`);

  // Insert reviews
  console.log("Inserting reviews...");
  const reviews: {
    profile_user_id: string;
    voter_user_id: string;
    type: "upvote" | "downvote";
    comment: string | null;
  }[] = [];
  for (let i = 0; i < insertedUsers.length; i++) {
    const numReviews = randomInt(
      CONFIG.reviewsPerUser.min,
      CONFIG.reviewsPerUser.max,
    );
    const otherUsers = insertedUsers.filter((_, idx) => idx !== i);
    const shuffled = [...otherUsers].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numReviews && j < shuffled.length; j++) {
      reviews.push({
        profile_user_id: insertedUsers[i].id,
        voter_user_id: shuffled[j].id,
        type: Math.random() < CONFIG.upvoteRate ? "upvote" : "downvote",
        comment:
          Math.random() < CONFIG.commentRate
            ? randomChoice(reviewComments)
            : null,
      });
    }
  }
  await db.insert(profileReviewsTable).values(reviews);
  console.log(`   Inserted ${reviews.length} reviews`);

  // Insert listings
  console.log("Inserting listings...");
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const listings: {
    author_id: string;
    requested_item_id?: string;
    requested_currency_id?: string;
    amount: number;
    order_type: "buy" | "sell";
    paying_type: "each" | "total";
    status: "active" | "paused" | "expired";
    expires_at: Date;
  }[] = [];

  for (const author of insertedUsers) {
    const numListings = randomInt(
      CONFIG.listingsPerUser.min,
      CONFIG.listingsPerUser.max,
    );
    for (let i = 0; i < numListings; i++) {
      const requestsCurrency = Math.random() < 0.2;
      const status =
        Math.random() > 0.1
          ? "active"
          : Math.random() > 0.5
            ? "paused"
            : "expired";
      const expiresAt = new Date(
        Date.now() +
          (status === "expired" ? -randomInt(1, 7) * 86400000 : thirtyDays),
      );

      if (requestsCurrency) {
        listings.push({
          author_id: author.id,
          requested_currency_id: randomChoice(insertedCurrencies).id,
          amount: randomInt(1000, 100000),
          order_type: Math.random() > 0.5 ? "buy" : "sell",
          paying_type: Math.random() > 0.7 ? "total" : "each",
          status,
          expires_at: expiresAt,
        });
      } else {
        listings.push({
          author_id: author.id,
          requested_item_id: randomChoice(insertedItems).id,
          amount: randomInt(1, 10),
          order_type: Math.random() > 0.5 ? "buy" : "sell",
          paying_type: Math.random() > 0.7 ? "total" : "each",
          status,
          expires_at: expiresAt,
        });
      }
    }
  }
  const insertedListings = await db
    .insert(listingsTable)
    .values(listings)
    .returning();
  console.log(`   Inserted ${insertedListings.length} listings`);

  // Insert offered items/currencies
  console.log("Inserting listing offers...");
  let offeredItemsCount = 0;
  let offeredCurrenciesCount = 0;

  for (let idx = 0; idx < insertedListings.length; idx++) {
    const listing = insertedListings[idx];
    const original = listings[idx];

    if (Math.random() > 0.15 && !original.requested_currency_id) {
      const numCurr = randomInt(1, Math.min(3, insertedCurrencies.length));
      const shuffled = [...insertedCurrencies].sort(() => Math.random() - 0.5);
      for (let i = 0; i < numCurr; i++) {
        await db.insert(listingOfferedCurrenciesTable).values({
          listing_id: listing.id,
          currency_id: shuffled[i].id,
          amount: randomInt(100, 50000),
        });
        offeredCurrenciesCount++;
      }
    }

    if (original.requested_currency_id) {
      const numItems = randomInt(1, 7);
      const shuffled = [...insertedItems].sort(() => Math.random() - 0.5);
      for (let i = 0; i < numItems && i < shuffled.length; i++) {
        await db.insert(listingOfferedItemsTable).values({
          listing_id: listing.id,
          item_id: shuffled[i].id,
          amount: randomInt(1, 5),
        });
        offeredItemsCount++;
      }
    } else if (Math.random() > 0.6) {
      const numItems = randomInt(1, 7);
      const shuffled = [...insertedItems].sort(() => Math.random() - 0.5);
      for (let i = 0; i < numItems && i < shuffled.length; i++) {
        if (shuffled[i].id !== original.requested_item_id) {
          await db.insert(listingOfferedItemsTable).values({
            listing_id: listing.id,
            item_id: shuffled[i].id,
            amount: randomInt(1, 5),
          });
          offeredItemsCount++;
        }
      }
    }
  }
  console.log(`   Inserted ${offeredCurrenciesCount} offered currencies`);
  console.log(`   Inserted ${offeredItemsCount} offered items`);

  console.log("\n=== Seed complete ===\n");
  console.log(`   Users:      ${insertedUsers.length}`);
  console.log(`   Categories: ${insertedCategories.length}`);
  console.log(`   Items:      ${insertedItems.length}`);
  console.log(`   Currencies: ${insertedCurrencies.length}`);
  console.log(`   Reviews:    ${reviews.length}`);
  console.log(`   Listings:   ${insertedListings.length}`);
  console.log(
    `   Offers:     ${offeredItemsCount} items + ${offeredCurrenciesCount} currencies`,
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
