const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  schema: "./build/schema/index.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
