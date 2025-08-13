import type { Config } from "drizzle-kit";
export default {
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@localhost:5432/stepexplorer",
  },
  verbose: true,
  strict: true,
} satisfies Config;
