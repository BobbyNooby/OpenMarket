import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/db";
import * as schema from "../db/auth-schema";

export const auth = betterAuth({
  baseURL: process.env.PUBLIC_API_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({
        name: profile.username, // Discord handle (e.g. "rudytf"), not display name
      }),
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord"],
    },
  },
  trustedOrigins: [
    process.env.PUBLIC_APP_URL ?? "http://localhost:5173",
    "http://localhost:4173",
  ],
});
